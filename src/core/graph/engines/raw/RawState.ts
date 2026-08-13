import type { Chunk } from '@logic-arrows/game-logic/chunk';
import {
    CycleHeadType,
    type GraphCycle,
} from 'src/core/graph/ast/cycle/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { NodeType, NodeTypes } from '../core/NodeType';
import { RawCycleState } from './RawCycleState';
import { RawCycleSnapshot, RawNodeSnapshot, RawSnapshot } from './RawSnapshot';

export class RawNodeState {
    public readonly nodeIdx;
    public readonly chunkIdx;

    public type: NodeType = NodeType.EMPTY;

    public links: RawNodeState[] = [];
    public detectorLinks: RawNodeState[] = [];

    public signal: NodeSignal = 0;
    public lastSignal: NodeSignal = 0;
    public signalsCount: number = 0;
    public blockedCount: number = 0;

    public isEntryPoint: boolean = false;
    public isAdditionalUpdate: boolean = false;
    public isBreakpoint: boolean = false;

    public cycleIdx: number | null = null;
    public headType: CycleHeadType = CycleHeadType.NONE;
    public cycleOffset: number = 0;

    public isUpdated: boolean = false;
    public isChanged: boolean = false;
    public isTempChanged: boolean = false;

    public constructor(
        public node: GraphNode,
        nodeIdx: number,
        chunkIdx: number,
    ) {
        this.nodeIdx = nodeIdx;
        this.chunkIdx = chunkIdx;
    }
}

export class RawChunkState {
    public isDirty: boolean = false;

    public constructor(public readonly chunkIdx: number) {}
}

export class RawGraphState {
    public changedNodes: RawNodeState[] = [];
    public tempChangedNodes: RawNodeState[] = [];

    private nodes: RawNodeState[] = [];
    private chunks: RawChunkState[] = [];

    public cycles: (RawCycleState | null)[] = [];

    public tick: number = 0;
    public breakPoint: boolean = false;
    public breakPointNode: number = 0;

    public clear() {
        this.changedNodes.length = 0;
        this.tempChangedNodes.length = 0;
        this.nodes.length = 0;
        this.chunks.length = 0;
        this.cycles.length = 0;
        this.tick = 0;
        this.breakPoint = false;
    }

    public getNode(nodeIdx: number): RawNodeState {
        return this.nodes[nodeIdx];
    }

    public resetNodeSignal(node: GraphNode) {
        const nodeState = this.nodes[node.nodeIdx];
        nodeState.lastSignal = 0;
        nodeState.signal = 0;
    }

    public updateNodeState(node: GraphNode) {
        if (this.nodes[node.nodeIdx] === undefined) {
            this.nodes[node.nodeIdx] = new RawNodeState(
                node,
                node.nodeIdx,
                node.chunkIdx,
            );
        }
        const nodeState = this.nodes[node.nodeIdx];

        nodeState.type = node.type;
        nodeState.links = node.links
            .filter(
                (linkedNode) =>
                    linkedNode.type !== NodeType.DETECTOR ||
                    node.type === NodeType.BLOCKER,
            )
            .map((linkedNode) => this.getNode(linkedNode.nodeIdx));

        nodeState.detectorLinks = node.links
            .filter(
                (linkedNode) =>
                    linkedNode.type === NodeType.DETECTOR &&
                    linkedNode.detectedLink === nodeState.node,
            )
            .map((node) => this.getNode(node.nodeIdx));

        nodeState.isEntryPoint = NodeTypes.isEntryPoint(nodeState.type);
        nodeState.isAdditionalUpdate = NodeTypes.isAdditionalUpdate(
            nodeState.type,
        );
        nodeState.isBreakpoint = node.isBreakpoint;
        if (node.cycleRef) {
            nodeState.cycleIdx = node.cycleRef.index;
            nodeState.headType = node.headType;
            nodeState.cycleOffset = node.cycleOffset;
        } else {
            nodeState.cycleIdx = null;
            nodeState.headType = CycleHeadType.NONE;
            nodeState.cycleOffset = 0;
        }

        nodeState.cycleOffset = node.cycleOffset;

        this.changedNodes.push(nodeState);
    }

    public updateChunk(chunk: Chunk) {
        if (chunk.astIndex === undefined || chunk.astIndex === null) return;
        if (this.chunks[chunk.astIndex] === undefined) {
            this.chunks[chunk.astIndex] = new RawChunkState(chunk.astIndex);
        }
    }

    public reset() {
        this.tick = 0;
        this.changedNodes.length = 0;
        this.tempChangedNodes.length = 0;
        this.nodes.forEach((nodeState) => {
            if (nodeState.isEntryPoint) this.changedNodes.push(nodeState);
        });
        this.nodes.forEach((node) => {
            node.signal = 0;
            node.lastSignal = 0;
            node.signalsCount = 0;
            node.blockedCount = 0;
            node.isUpdated = false;
            node.isChanged = false;
            node.isTempChanged = false;
        });
        this.chunks.forEach((chunk) => {
            chunk.isDirty = true;
        });

        this.cycles.forEach((cycle) => {
            if (cycle) cycle.clear();
        });
        this.tick = 0;
    }

    public makeDirtyChunk(chunkIdx: number) {
        this.chunks[chunkIdx].isDirty = true;
    }

    public getDirtyChunks(
        markUndirty: boolean = false,
    ): [...chunkIdx: number[]] {
        const dirtyChunks: number[] = [];
        this.chunks.forEach((chunk) => {
            if (chunk.isDirty) {
                if (markUndirty) chunk.isDirty = false;
                dirtyChunks.push(chunk.chunkIdx);
            }
        });
        return dirtyChunks;
    }

    public makeUndirtyChunk(chunkIdx: number) {
        this.chunks[chunkIdx].isDirty = false;
    }

    public markAllChunksDirty() {
        this.chunks.forEach((chunk) => {
            chunk.isDirty = true;
        });
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        const nodeState = this.getNode(nodeIdx);
        const cycleIdx = nodeState.cycleIdx;
        if (cycleIdx !== null && nodeState.headType === CycleHeadType.NONE) {
            const cycleState = this.cycles[cycleIdx];
            if (!cycleState) return NodeSignal.NONE;
            const isActive = cycleState.getBit(
                this.tick,
                nodeState.cycleOffset,
            );
            if (isActive) return NodeSignal.ACTIVE;
            return NodeSignal.NONE;
        }
        if (nodeState.signal === NodeSignal.NONE) return NodeSignal.NONE;
        else if (nodeState.signal === NodeSignal.PENDING)
            return NodeSignal.PENDING;
        else return NodeSignal.ACTIVE;
    }

    public addCycle(cycle: GraphCycle) {
        if (this.cycles[cycle.index]) return;

        this.cycles[cycle.index] = new RawCycleState(
            cycle.index,
            cycle.nodes.length,
        );
    }

    public removeCycle(cycle: GraphCycle) {
        this.cycles[cycle.index] = null;
    }

    public makeSnapshot(): RawSnapshot {
        const snapshot = new RawSnapshot();

        snapshot.tick = this.tick;
        snapshot.breakPoint = this.breakPoint;

        snapshot.nodes = this.nodes.map((nodeState, nodeIdx) => {
            const nodeSnapshot = new RawNodeSnapshot();
            nodeSnapshot.nodeIdx = nodeIdx;

            nodeSnapshot.signal = nodeState.signal;
            nodeSnapshot.lastSignal = nodeState.lastSignal;
            nodeSnapshot.signalsCount = nodeState.signalsCount;
            nodeSnapshot.blockedCount = nodeState.blockedCount;

            return nodeSnapshot;
        });

        snapshot.chunks = this.chunks.map((chunk) => chunk.chunkIdx);

        snapshot.changedNodes = this.changedNodes.map(
            (nodeState) => nodeState.nodeIdx,
        );

        snapshot.tempChangedNodes = this.tempChangedNodes.map(
            (nodeState) => nodeState.nodeIdx,
        );

        snapshot.cycles = this.cycles
            .map((cycleState, cycleIdx) => {
                if (cycleState === null || cycleState === undefined)
                    return null;

                const cycleSnapshot = new RawCycleSnapshot(
                    cycleIdx,
                    cycleState.length,
                );
                cycleSnapshot.state.set(cycleState.state);

                return cycleSnapshot;
            })
            .filter((cycle) => cycle !== null);

        return snapshot;
    }

    public loadSnapshot(snapshot: RawSnapshot) {
        this.tick = snapshot.tick;
        this.breakPoint = snapshot.breakPoint;

        snapshot.nodes.forEach((nodeSnapshot) => {
            const nodeState = this.getNode(nodeSnapshot.nodeIdx);
            nodeState.signal = nodeSnapshot.signal;
            nodeState.lastSignal = nodeSnapshot.lastSignal;
            nodeState.signalsCount = nodeSnapshot.signalsCount;
            nodeState.blockedCount = nodeSnapshot.blockedCount;
        });

        snapshot.chunks.forEach((chunkIdx) => {
            this.makeDirtyChunk(chunkIdx);
        });

        const visitedChanged: Set<number> = new Set();
        const updatedNodes = this.changedNodes.filter(
            (nodeState) => nodeState.isUpdated,
        );
        this.changedNodes.forEach((nodeState) => {
            nodeState.isChanged = false;
        });
        this.changedNodes.length = 0;
        snapshot.changedNodes.forEach((nodeIdx) => {
            if (visitedChanged.has(nodeIdx)) return;
            visitedChanged.add(nodeIdx);
            this.markNodeChanged(this.getNode(nodeIdx));
        });
        updatedNodes.forEach((nodeState) => {
            if (visitedChanged.has(nodeState.nodeIdx)) return;
            visitedChanged.add(nodeState.nodeIdx);
            this.markNodeChanged(nodeState);
        });

        visitedChanged.clear();
        const updatedTempNodes = this.tempChangedNodes.filter(
            (nodeState) => nodeState.isUpdated,
        );
        this.tempChangedNodes.forEach((nodeState) => {
            nodeState.isTempChanged = false;
        });
        this.tempChangedNodes.length = 0;
        snapshot.tempChangedNodes.forEach((nodeIdx) => {
            if (visitedChanged.has(nodeIdx)) return;
            visitedChanged.add(nodeIdx);
            this.markNodeTempChanged(this.getNode(nodeIdx));
        });
        updatedTempNodes.forEach((nodeState) => {
            if (visitedChanged.has(nodeState.nodeIdx)) return;
            visitedChanged.add(nodeState.nodeIdx);
            this.markNodeTempChanged(nodeState);
        });

        snapshot.cycles.forEach((cycleSnapshot) => {
            const cycleState = this.cycles[cycleSnapshot.cycleIdx];
            if (!cycleState) return;
            if (cycleState.length !== cycleSnapshot.length) return;
            cycleState.state.set(cycleSnapshot.state);
        });

        return snapshot;
    }

    public markNodeChanged(nodeState: RawNodeState) {
        this.changedNodes.push(nodeState);
    }

    public markNodeTempChanged(nodeState: RawNodeState) {
        nodeState.isChanged = true;
        this.tempChangedNodes.push(nodeState);
    }

    public setNodeSignal(nodeIdx: number, signal: NodeSignal) {
        const nodeState = this.getNode(nodeIdx);

        const cycleIdx = nodeState.cycleIdx;
        if (cycleIdx !== null && nodeState.headType === CycleHeadType.NONE) {
            const cycleState = this.cycles[cycleIdx];
            if (!cycleState) return;
            if (signal === NodeSignal.NONE) {
                cycleState.clearBit(this.tick, nodeState.cycleOffset);
            } else {
                cycleState.writeBit(this.tick, nodeState.cycleOffset);
            }
        } else {
            nodeState.signal = signal;
            this.markNodeChanged(nodeState);
            if (!nodeState.isChanged) this.markNodeTempChanged(nodeState);
        }
        this.makeDirtyChunk(nodeState.chunkIdx);
    }
}
