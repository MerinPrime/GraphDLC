import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { RawCycle } from '../CycleTypes';
import { NodeSignal } from '../core/NodeSignal';
import { NodeType, NodeTypes } from '../core/NodeType';
import type { GraphNode } from '../GraphNode';
import { RawCycleState } from './RawCycleState';
import { RawCycleSnapshot, RawNodeSnapshot, RawSnapshot } from './RawSnapshot';

export class RawNodeState {
    public type: NodeType = NodeType.EMPTY;

    public signal: number = 0;
    public lastSignal: number = 0;
    public signalsCount: number = 0;
    public blockedCount: number = 0;
    public nodeInCycleOffset: number = 0;

    public isEntryPoint: boolean = false;
    public isAdditionalUpdate: boolean = false;
    public isUpdated: boolean = false;

    public isChanged: boolean = false;
    public isTempChanged: boolean = false;

    public constructor(public node: GraphNode) {}
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

    public getNode(nodeIdx: number): RawNodeState {
        return this.nodes[nodeIdx];
    }

    public clear() {
        this.changedNodes.length = 0;
        this.tempChangedNodes.length = 0;
        this.nodes.length = 0;
        this.chunks.length = 0;
        this.cycles.length = 0;
        this.tick = 0;
        this.breakPoint = false;
    }

    public updateNode(node: GraphNode) {
        if (this.nodes[node.nodeIdx] === undefined) {
            this.nodes[node.nodeIdx] = new RawNodeState(node);
        }
        const nodeState = this.nodes[node.nodeIdx];
        nodeState.type = NodeTypes.fromArrowType(node.type);
        nodeState.isEntryPoint = NodeTypes.isEntryPoint(nodeState.type);
        nodeState.isAdditionalUpdate = NodeTypes.isAdditionalUpdate(
            nodeState.type,
        );
        nodeState.lastSignal = 0;
        nodeState.signal = 0;

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

    public getDirtyChunks(): [...chunkIdx: number[]] {
        const dirtyChunks: number[] = [];
        this.chunks.forEach((chunk) => {
            if (chunk.isDirty) {
                chunk.isDirty = false;
                dirtyChunks.push(chunk.chunkIdx);
            }
        });
        return dirtyChunks;
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        const nodeState = this.getNode(nodeIdx);
        const cycle = nodeState.node.cycleRef;
        if (cycle) {
            const cycleState = this.cycles[cycle.index];
            if (!cycleState) return NodeSignal.NONE;
            const isActive = cycleState.getBit(
                this.tick,
                nodeState.node.origCycleOffset,
            );
            if (isActive) return NodeSignal.ACTIVE;
            return NodeSignal.NONE;
        }
        if (nodeState.signal === NodeSignal.NONE) return NodeSignal.NONE;
        else if (nodeState.signal === NodeSignal.PENDING)
            return NodeSignal.PENDING;
        else return NodeSignal.ACTIVE;
    }

    public addCycle(rawCycle: RawCycle) {
        if (this.cycles[rawCycle.index]) return;

        this.cycles[rawCycle.index] = new RawCycleState(rawCycle.nodes.length);
        for (const node of rawCycle.nodes) {
            this.getNode(node.nodeIdx).nodeInCycleOffset = node.cycleOffset;
        }
        for (const head of rawCycle.heads) {
            this.getNode(head.nodeIdx).nodeInCycleOffset = head.cycleOffset;
        }
    }

    public removeCycle(rawCycle: RawCycle) {
        this.cycles[rawCycle.index] = null;
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
            (nodeState) => nodeState.node.nodeIdx,
        );

        snapshot.tempChangedNodes = this.tempChangedNodes.map(
            (nodeState) => nodeState.node.nodeIdx,
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

        const updatedNodes = this.changedNodes.filter(
            (nodeState) => nodeState.isUpdated,
        );
        this.changedNodes.forEach((nodeState) => {
            nodeState.isChanged = false;
        });
        this.changedNodes.length = 0;
        snapshot.changedNodes.forEach((nodeIdx) => {
            this.markNodeChanged(this.getNode(nodeIdx));
        });
        updatedNodes.forEach((nodeState) => {
            this.markNodeChanged(nodeState);
        });

        const updatedTempNodes = this.tempChangedNodes.filter(
            (nodeState) => nodeState.isUpdated,
        );
        this.tempChangedNodes.forEach((nodeState) => {
            nodeState.isTempChanged = false;
        });
        this.tempChangedNodes.length = 0;
        snapshot.tempChangedNodes.forEach((nodeIdx) => {
            this.markNodeTempChanged(this.getNode(nodeIdx));
        });
        updatedTempNodes.forEach((nodeState) => {
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
        if (nodeState.isChanged) return;
        nodeState.isChanged = true;
        this.changedNodes.push(nodeState);
    }

    public markNodeTempChanged(nodeState: RawNodeState) {
        this.tempChangedNodes.push(nodeState);
    }
}
