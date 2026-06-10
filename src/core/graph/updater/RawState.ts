import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { RawCycle } from '../CycleTypes';
import { NodeSignal } from '../core/NodeSignal';
import { NodeType, NodeTypes } from '../core/NodeType';
import type { GraphNode } from '../GraphNode';
import { RawCycleState } from './RawCycleState';

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
}
