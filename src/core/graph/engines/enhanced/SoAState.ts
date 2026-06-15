import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { DynamicU32Array } from 'src/core/utils/DynamicU32Array';
import { CycleHeadType, type GraphCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { NodeType, NodeTypes } from '../core/NodeType';
import { SoACycleState } from './SoACycleState';
import { SoALayout } from './SoALayout';
import { SoACycleSnapshot, SoANodeSnapshot, SoASnapshot } from './SoASnapshot';

export class SoANodeState {
    public readonly nodeIdx;

    public cycleIdx: number | null = null;
    public headType: CycleHeadType = CycleHeadType.NONE;
    public cycleOffset: number = 0;

    public constructor(
        public node: GraphNode,
        nodeIdx: number,
    ) {
        this.nodeIdx = nodeIdx;
    }
}

export class SoAChunkState {
    public isDirty: boolean = false;

    public constructor(public readonly chunkIdx: number) {}
}

const INIT_NODE_COUNT = 1024;
const INIT_CHUNK_COUNT = 4;

export class SoAGraphState {
    public changedNodes: DynamicU32Array = new DynamicU32Array(INIT_NODE_COUNT);
    public tempChangedNodes: DynamicU32Array = new DynamicU32Array(
        INIT_NODE_COUNT,
    );

    private nodes: SoANodeState[] = [];

    public cycles: (SoACycleState | null)[] = [];

    public tick: number = 0;
    public breakPoint: boolean = false;

    public nodeData: Uint8Array = new Uint8Array(
        INIT_NODE_COUNT * SoALayout.Node.STRIDE,
    );
    public extraNodeData: Uint8Array = new Uint8Array(
        INIT_NODE_COUNT * SoALayout.ExtraNode.STRIDE,
    );
    public linkIndices: Uint32Array = new Uint32Array(
        INIT_NODE_COUNT * SoALayout.Links.STRIDE,
    );
    public detectorIndices: Uint32Array = new Uint32Array(
        INIT_NODE_COUNT * SoALayout.Detectors.STRIDE,
    );

    private nodeCount: number = 0;
    private nodeCapacity: number = INIT_NODE_COUNT;

    private chunks: Uint8Array = new Uint8Array(
        INIT_CHUNK_COUNT * SoALayout.Chunk.STRIDE,
    );
    private chunkCount = 0;
    private chunkCapacity = INIT_CHUNK_COUNT;

    public clear() {
        this.nodeCount = 0;
        this.chunkCount = 0;
        this.changedNodes.clear();
        this.tempChangedNodes.clear();
        this.nodes.length = 0;
        this.cycles.length = 0;
        this.tick = 0;
        this.breakPoint = false;
    }

    public getNode(nodeIdx: number): SoANodeState {
        return this.nodes[nodeIdx];
    }

    public ensureNodeCapacity(count: number) {
        this.nodeCount = Math.max(this.nodeCount, count);

        if (this.nodeCapacity >= count) return;

        let newCapacity = this.nodeCapacity || 2;
        while (newCapacity < count) {
            newCapacity *= 2;
        }

        this.nodeCapacity = newCapacity;

        const tempNodeData = new Uint8Array(
            newCapacity * SoALayout.Node.STRIDE,
        );
        tempNodeData.set(this.nodeData);
        this.nodeData = tempNodeData;

        const tempExtraNodeData = new Uint8Array(
            newCapacity * SoALayout.ExtraNode.STRIDE,
        );
        tempExtraNodeData.set(this.extraNodeData);
        this.extraNodeData = tempExtraNodeData;

        const tempLinkIndices = new Uint32Array(
            newCapacity * SoALayout.Links.STRIDE,
        );
        tempLinkIndices.set(this.linkIndices);
        this.linkIndices = tempLinkIndices;

        const tempDetectorIndices = new Uint32Array(
            newCapacity * SoALayout.Detectors.STRIDE,
        );
        tempDetectorIndices.set(this.detectorIndices);
        this.detectorIndices = tempDetectorIndices;
    }

    public ensureChunkCapacity(count: number) {
        this.chunkCount = Math.max(this.chunkCount, count);

        if (this.chunkCapacity >= count) return;

        let newCapacity = this.chunkCapacity || 2;
        while (newCapacity < count) {
            newCapacity *= 2;
        }

        this.chunkCapacity = newCapacity;

        const tempChunks = new Uint8Array(newCapacity * SoALayout.Chunk.STRIDE);
        tempChunks.set(this.chunks);
        this.chunks = tempChunks;
    }

    public updateNodeState(node: GraphNode, resetSignal: boolean = false) {
        if (this.nodes[node.nodeIdx] === undefined) {
            this.nodes[node.nodeIdx] = new SoANodeState(node, node.nodeIdx);
        }
        this.ensureNodeCapacity(node.nodeIdx + 1);

        const nodeOffset = node.nodeIdx * SoALayout.Node.STRIDE;
        const linksOffset = node.nodeIdx * SoALayout.Links.STRIDE;
        const detectorsOffset = node.nodeIdx * SoALayout.Detectors.STRIDE;

        const nodeState = this.nodes[node.nodeIdx];

        this.nodeData[nodeOffset + SoALayout.Node.TYPE] = node.type;

        const links = node.links
            .filter((linkedNode) => linkedNode.type !== NodeType.DETECTOR)
            .map((linkedNode) => linkedNode.nodeIdx);
        this.nodeData[nodeOffset + SoALayout.Node.LINKS_COUNT] = links.length;
        this.linkIndices.set(links, linksOffset);

        const detectors = node.links
            .filter(
                (linkedNode) =>
                    linkedNode.type === NodeType.DETECTOR &&
                    linkedNode.detectedLink === node,
            )
            .map((node) => node.nodeIdx);
        this.nodeData[nodeOffset + SoALayout.Node.DETECTORS_COUNT] =
            detectors.length;
        this.detectorIndices.set(detectors, detectorsOffset);

        const flagsOffset = nodeOffset + SoALayout.Node.FLAGS;

        if (NodeTypes.isEntryPoint(node.type))
            this.nodeData[flagsOffset] |= SoALayout.Node.Flags.IsEntryPoint;
        else this.nodeData[flagsOffset] &= ~SoALayout.Node.Flags.IsEntryPoint;

        if (NodeTypes.isAdditionalUpdate(node.type))
            this.nodeData[flagsOffset] |=
                SoALayout.Node.Flags.IsAdditionalUpdate;
        else
            this.nodeData[flagsOffset] &=
                ~SoALayout.Node.Flags.IsAdditionalUpdate;

        if (node.isBreakpoint)
            this.nodeData[flagsOffset] |= SoALayout.Node.Flags.IsBreakpoint;
        else this.nodeData[flagsOffset] &= ~SoALayout.Node.Flags.IsBreakpoint;

        if (node.cycleRef) {
            nodeState.cycleIdx = node.cycleRef.index;
            nodeState.headType = node.headType;
            nodeState.cycleOffset = node.cycleOffset;
        } else {
            nodeState.cycleIdx = null;
            nodeState.headType = CycleHeadType.NONE;
            nodeState.cycleOffset = 0;
        }
        if (resetSignal) {
            this.nodeData[nodeOffset + SoALayout.Node.SIGNAL] = 0;
            this.nodeData[nodeOffset + SoALayout.Node.LAST_SIGNAL] = 0;
        }

        nodeState.cycleOffset = node.cycleOffset;

        this.changedNodes.add(nodeState.nodeIdx);
    }

    public updateChunk(chunk: Chunk) {
        if (chunk.astIndex === undefined || chunk.astIndex === null) return;
        const chunkIdx = chunk.astIndex;
        this.ensureChunkCapacity(chunkIdx + 1);
    }

    public reset() {
        this.changedNodes.clear();
        this.tempChangedNodes.clear();

        for (let nodeIdx = 0; nodeIdx < this.nodeCount; nodeIdx++) {
            const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
            this.nodeData[nodeOffset + SoALayout.Node.SIGNAL] = NodeSignal.NONE;
            this.nodeData[nodeOffset + SoALayout.Node.LAST_SIGNAL] =
                NodeSignal.NONE;
            this.nodeData[nodeOffset + SoALayout.Node.SIGNALS_COUNT] = 0;
            this.nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT] = 0;
            let flags = this.nodeData[nodeOffset + SoALayout.Node.FLAGS];
            flags &= ~SoALayout.Node.Flags.IsChanged;
            flags &= ~SoALayout.Node.Flags.IsUpdated;
            this.nodeData[nodeOffset + SoALayout.Node.FLAGS] = flags;

            const isEntryPoint =
                (flags & SoALayout.Node.Flags.IsEntryPoint) !== 0;
            if (isEntryPoint) {
                this.changedNodes.add(nodeIdx);
            }
        }

        for (let chunkIdx = 0; chunkIdx < this.chunkCount; chunkIdx++) {
            const chunkOffset = chunkIdx * SoALayout.Chunk.STRIDE;
            this.chunks[chunkOffset + SoALayout.Chunk.FLAGS] |=
                SoALayout.Chunk.Flags.IsDirty;
        }

        this.cycles.forEach((cycle) => {
            if (cycle) cycle.clear();
        });

        this.tick = 0;
    }

    public makeDirtyChunk(chunkIdx: number) {
        const chunkOffset = chunkIdx * SoALayout.Chunk.STRIDE;
        this.chunks[chunkOffset + SoALayout.Chunk.FLAGS] |=
            SoALayout.Chunk.Flags.IsDirty;
    }

    public getDirtyChunks(
        markUndirty: boolean = false,
    ): [...chunkIdx: number[]] {
        const dirtyChunks: number[] = [];
        for (let chunkIdx = 0; chunkIdx < this.chunkCount; chunkIdx++) {
            const chunkOffset = chunkIdx * SoALayout.Chunk.STRIDE;
            const flagsOffset = chunkOffset + SoALayout.Chunk.FLAGS;
            if (
                (this.chunks[flagsOffset] & SoALayout.Chunk.Flags.IsDirty) ===
                0
            )
                continue;
            if (markUndirty) {
                this.chunks[flagsOffset] &= ~SoALayout.Chunk.Flags.IsDirty;
            }
            dirtyChunks.push(chunkIdx);
        }
        return dirtyChunks;
    }

    public makeUndirtyChunk(chunkIdx: number) {
        const chunkOffset = chunkIdx * SoALayout.Chunk.STRIDE;
        this.chunks[chunkOffset + SoALayout.Chunk.FLAGS] &=
            ~SoALayout.Chunk.Flags.IsDirty;
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
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
        return this.nodeData[nodeOffset + SoALayout.Node.SIGNAL] as NodeSignal;
    }

    public addCycle(cycle: GraphCycle) {
        if (this.cycles[cycle.index]) return;

        this.cycles[cycle.index] = new SoACycleState(
            cycle.index,
            cycle.nodes.length,
        );
    }

    public removeCycle(cycle: GraphCycle) {
        this.cycles[cycle.index] = null;
    }

    public makeSnapshot(): SoASnapshot {
        const snapshot = new SoASnapshot();

        snapshot.tick = this.tick;
        snapshot.breakPoint = this.breakPoint;

        snapshot.nodes = Array.from(
            { length: this.nodeCount },
            (_, nodeIdx) => {
                const nodeSnapshot = new SoANodeSnapshot();
                const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;

                nodeSnapshot.nodeIdx = nodeIdx;
                nodeSnapshot.signal = this.nodeData[
                    nodeOffset + SoALayout.Node.SIGNAL
                ] as NodeSignal;
                nodeSnapshot.lastSignal = this.nodeData[
                    nodeOffset + SoALayout.Node.LAST_SIGNAL
                ] as NodeSignal;
                nodeSnapshot.signalsCount =
                    this.nodeData[nodeOffset + SoALayout.Node.SIGNALS_COUNT];
                nodeSnapshot.blockedCount =
                    this.nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT];

                return nodeSnapshot;
            },
        );

        snapshot.chunks = Array.from({ length: this.chunkCount }, (_, i) => i);

        snapshot.changedNodes = Array.from(
            { length: this.changedNodes.length },
            (_, i) => this.changedNodes.buffer[i],
        );
        snapshot.tempChangedNodes = Array.from(
            { length: this.tempChangedNodes.length },
            (_, i) => this.tempChangedNodes.buffer[i],
        );

        snapshot.cycles = this.cycles
            .map((cycleState, cycleIdx) => {
                if (cycleState === null || cycleState === undefined)
                    return null;

                const cycleSnapshot = new SoACycleSnapshot(
                    cycleIdx,
                    cycleState.length,
                );
                cycleSnapshot.state.set(cycleState.state);

                return cycleSnapshot;
            })
            .filter((cycle) => cycle !== null);

        return snapshot;
    }

    public loadSnapshot(snapshot: SoASnapshot) {
        this.tick = snapshot.tick;
        this.breakPoint = snapshot.breakPoint;

        snapshot.nodes.forEach((nodeSnapshot) => {
            const nodeOffset = nodeSnapshot.nodeIdx * SoALayout.Node.STRIDE;

            this.nodeData[nodeOffset + SoALayout.Node.SIGNAL] =
                nodeSnapshot.signal;
            this.nodeData[nodeOffset + SoALayout.Node.LAST_SIGNAL] =
                nodeSnapshot.lastSignal;
            this.nodeData[nodeOffset + SoALayout.Node.SIGNALS_COUNT] =
                nodeSnapshot.signalsCount;
            this.nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT] =
                nodeSnapshot.blockedCount;
        });

        snapshot.chunks.forEach((chunkIdx) => {
            this.makeDirtyChunk(chunkIdx);
        });

        const visitedChanged: Set<number> = new Set();
        const updatedNodes = Array.from(
            { length: this.changedNodes.length },
            (_, i) => this.changedNodes.buffer[i],
        ).filter((nodeIdx) => {
            const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
            return (
                (this.nodeData[nodeOffset + SoALayout.Node.FLAGS] &
                    SoALayout.Node.Flags.IsUpdated) !==
                0
            );
        });
        for (let i = 0; i < this.changedNodes.length; i++) {
            const nodeIdx = this.changedNodes.buffer[i];
            const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
            this.nodeData[nodeOffset + SoALayout.Node.FLAGS] &=
                ~SoALayout.Node.Flags.IsChanged;
        }
        this.changedNodes.clear();
        snapshot.changedNodes.forEach((nodeIdx) => {
            if (visitedChanged.has(nodeIdx)) return;
            visitedChanged.add(nodeIdx);
            this.markNodeChanged(nodeIdx);
        });
        updatedNodes.forEach((nodeIdx) => {
            if (visitedChanged.has(nodeIdx)) return;
            visitedChanged.add(nodeIdx);
            this.markNodeChanged(nodeIdx);
        });

        visitedChanged.clear();
        const updatedTempNodes = Array.from(
            { length: this.changedNodes.length },
            (_, i) => this.changedNodes.buffer[i],
        ).filter((nodeIdx) => {
            const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
            return (
                (this.nodeData[nodeOffset + SoALayout.Node.FLAGS] &
                    SoALayout.Node.Flags.IsUpdated) !==
                0
            );
        });
        this.tempChangedNodes.clear();
        snapshot.tempChangedNodes.forEach((nodeIdx) => {
            if (visitedChanged.has(nodeIdx)) return;
            visitedChanged.add(nodeIdx);
            this.markNodeTempChanged(nodeIdx);
        });
        updatedTempNodes.forEach((nodeIdx) => {
            if (visitedChanged.has(nodeIdx)) return;
            visitedChanged.add(nodeIdx);
            this.markNodeTempChanged(nodeIdx);
        });

        snapshot.cycles.forEach((cycleSnapshot) => {
            const cycleState = this.cycles[cycleSnapshot.cycleIdx];
            if (!cycleState) return;
            if (cycleState.length !== cycleSnapshot.length) return;
            cycleState.state.set(cycleSnapshot.state);
        });

        return snapshot;
    }

    public markNodeChanged(nodeIdx: number) {
        this.changedNodes.add(nodeIdx);
    }

    public markNodeTempChanged(nodeIdx: number) {
        const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
        this.nodeData[nodeOffset + SoALayout.Node.FLAGS] |=
            SoALayout.Node.Flags.IsChanged;
        this.tempChangedNodes.add(nodeIdx);
    }
}
