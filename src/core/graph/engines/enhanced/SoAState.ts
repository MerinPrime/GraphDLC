import type { Chunk } from '@logic-arrows/game-logic/chunk';
import {
    CycleHeadType,
    type GraphCycle,
} from 'src/core/graph/ast/cycle/CycleTypes';
import { DynamicU32Array } from 'src/core/utils/DynamicU32Array';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { NodeType, NodeTypes } from '../core/NodeType';
import { SoACycleState } from './SoACycleState';
import { SoALayout } from './SoALayout';
import { SoANodeStorage } from './SoANodeStorage';
import { SoACycleSnapshot, SoANodeSnapshot, SoASnapshot } from './SoASnapshot';

const INIT_NODE_COUNT = 1024;
const INIT_CHUNK_COUNT = 4;
const INVALID_INDEX = 0xffffffff;

export class SoAGraphState {
    public readonly storage = new SoANodeStorage(INIT_NODE_COUNT);

    public changedNodes = new DynamicU32Array(INIT_NODE_COUNT);
    public tempChangedNodes = new DynamicU32Array(INIT_NODE_COUNT);
    public cycles: (SoACycleState | null)[] = [];

    public tick: number = 0;
    public breakPoint: boolean = false;
    public breakPointNode: number = 0;

    private chunks = new Uint8Array(INIT_CHUNK_COUNT * SoALayout.Chunk.STRIDE);
    private chunkCount = 0;
    private chunkCapacity = INIT_CHUNK_COUNT;

    private setFlag(
        array: Uint8Array,
        offset: number,
        flag: number,
        value: boolean,
    ): void {
        if (value) array[offset] |= flag;
        else array[offset] &= ~flag;
    }

    private hasFlag(array: Uint8Array, offset: number, flag: number): boolean {
        return (array[offset] & flag) !== 0;
    }

    public clear(): void {
        this.storage.clear();
        this.chunkCount = 0;
        this.changedNodes.clear();
        this.tempChangedNodes.clear();
        this.cycles.length = 0;
        this.tick = 0;
        this.breakPoint = false;
    }

    public ensureNodeCapacity(count: number): void {
        this.storage.ensureCapacity(count);
    }

    public ensureChunkCapacity(count: number): void {
        this.chunkCount = Math.max(this.chunkCount, count);
        if (this.chunkCapacity >= count) return;

        let newCapacity = this.chunkCapacity || 2;
        while (newCapacity < count) newCapacity *= 2;
        this.chunkCapacity = newCapacity;

        const nextChunks = new Uint8Array(newCapacity * SoALayout.Chunk.STRIDE);
        nextChunks.set(this.chunks);
        this.chunks = nextChunks;
    }

    public reset(): void {
        this.changedNodes.clear();
        this.tempChangedNodes.clear();

        const nodeCount = this.storage.count;
        for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
            const offset = this.storage.inlineNodeOffset(nodeIdx);
            const flagsOffset = offset + SoALayout.Node.FLAGS;

            this.storage.nodeData[offset + SoALayout.Node.SIGNAL] =
                NodeSignal.NONE;
            this.storage.nodeData[offset + SoALayout.Node.LAST_SIGNAL] =
                NodeSignal.NONE;
            this.storage.nodeData[offset + SoALayout.Node.SIGNALS_COUNT] = 0;
            this.storage.nodeData[offset + SoALayout.Node.BLOCKED_COUNT] = 0;

            this.storage.nodeData[flagsOffset] &= ~(
                SoALayout.Node.Flags.IsChanged | SoALayout.Node.Flags.IsUpdated
            );

            if (
                this.hasFlag(
                    this.storage.nodeData,
                    flagsOffset,
                    SoALayout.Node.Flags.IsEntryPoint,
                )
            ) {
                this.changedNodes.add(nodeIdx);
            }
        }

        this.markAllChunksDirty();
        for (let i = 0; i < this.cycles.length; i++) {
            this.cycles[i]?.clear();
        }
        this.tick = 0;
    }

    public updateNodeState(node: GraphNode): void {
        const nodeIdx = node.nodeIdx;
        this.ensureNodeCapacity(nodeIdx + 1);

        const nodeOffset = this.storage.inlineNodeOffset(nodeIdx);
        const linksOffset = this.storage.inlineLinksOffset(nodeIdx);
        const detectorsOffset = this.storage.inlineDetectorsOffset(nodeIdx);

        this.storage.nodeData[nodeOffset + SoALayout.Node.TYPE] = node.type;

        let linksCount = 0;
        let detectorsCount = 0;

        for (let i = 0; i < node.links.length; i++) {
            const linkedNode = node.links[i];
            const isDetector = linkedNode.type === NodeType.DETECTOR;

            if (isDetector && node.type !== NodeType.BLOCKER) {
                if (linkedNode.detectedLink === node) {
                    this.storage.detectorIndices[
                        detectorsOffset + detectorsCount++
                    ] = linkedNode.nodeIdx;
                }
            } else {
                this.storage.linkIndices[linksOffset + linksCount++] =
                    linkedNode.nodeIdx;
            }
        }

        this.storage.nodeData[nodeOffset + SoALayout.Node.LINKS_COUNT] =
            linksCount;
        this.storage.nodeData[nodeOffset + SoALayout.Node.DETECTORS_COUNT] =
            detectorsCount;

        const flagsOffset = nodeOffset + SoALayout.Node.FLAGS;
        this.setFlag(
            this.storage.nodeData,
            flagsOffset,
            SoALayout.Node.Flags.IsEntryPoint,
            NodeTypes.isEntryPoint(node.type),
        );
        this.setFlag(
            this.storage.nodeData,
            flagsOffset,
            SoALayout.Node.Flags.IsAdditionalUpdate,
            NodeTypes.isAdditionalUpdate(node.type),
        );
        this.setFlag(
            this.storage.nodeData,
            flagsOffset,
            SoALayout.Node.Flags.IsBreakpoint,
            node.isBreakpoint,
        );

        const extra8Offset = this.storage.inlineExtra8Offset(nodeIdx);
        const extra32Offset = this.storage.inlineExtra32Offset(nodeIdx);

        if (node.cycleRef) {
            this.storage.extra32NodeData[
                extra32Offset + SoALayout.Extra32Node.CYCLE_IDX
            ] = node.cycleRef.index;
            this.storage.extra32NodeData[
                extra32Offset + SoALayout.Extra32Node.CYCLE_OFFSET
            ] = node.cycleOffset;
            this.storage.extra8NodeData[
                extra8Offset + SoALayout.Extra8Node.HEAD_TYPE
            ] = node.headType;

            const isHead =
                node.headType !== CycleHeadType.NONE &&
                node.headType !== CycleHeadType.READ;
            this.setFlag(
                this.storage.nodeData,
                flagsOffset,
                SoALayout.Node.Flags.IsCycleHead,
                isHead,
            );
            this.setFlag(
                this.storage.nodeData,
                flagsOffset,
                SoALayout.Node.Flags.IsInCycle,
                true,
            );
            this.setFlag(
                this.storage.nodeData,
                flagsOffset,
                SoALayout.Node.Flags.IsReadHead,
                node.headType === CycleHeadType.READ,
            );
        } else {
            this.storage.extra32NodeData[
                extra32Offset + SoALayout.Extra32Node.CYCLE_IDX
            ] = 0;
            this.storage.extra32NodeData[
                extra32Offset + SoALayout.Extra32Node.CYCLE_OFFSET
            ] = 0;
            this.storage.extra8NodeData[
                extra8Offset + SoALayout.Extra8Node.HEAD_TYPE
            ] = CycleHeadType.NONE;

            this.setFlag(
                this.storage.nodeData,
                flagsOffset,
                SoALayout.Node.Flags.IsCycleHead,
                false,
            );
            this.setFlag(
                this.storage.nodeData,
                flagsOffset,
                SoALayout.Node.Flags.IsInCycle,
                false,
            );
            this.setFlag(
                this.storage.nodeData,
                flagsOffset,
                SoALayout.Node.Flags.IsReadHead,
                false,
            );
        }

        this.storage.extra32NodeData[
            extra32Offset + SoALayout.Extra32Node.CHUNK_IDX
        ] = node.chunkIdx;
        this.storage.extra32NodeData[
            extra32Offset + SoALayout.Extra32Node.BLOCKED_LINK_IDX
        ] =
            node.blockedLink !== null
                ? node.blockedLink.nodeIdx
                : INVALID_INDEX;

        this.changedNodes.add(nodeIdx);
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        const nodeOffset = this.storage.inlineNodeOffset(nodeIdx);
        const extra32Offset = this.storage.inlineExtra32Offset(nodeIdx);
        const extra8Offset = this.storage.inlineExtra8Offset(nodeIdx);

        const cycleIdx =
            this.storage.extra32NodeData[
                extra32Offset + SoALayout.Extra32Node.CYCLE_IDX
            ];
        const cycleOffset =
            this.storage.extra32NodeData[
                extra32Offset + SoALayout.Extra32Node.CYCLE_OFFSET
            ];
        const headType = this.storage.extra8NodeData[
            extra8Offset + SoALayout.Extra8Node.HEAD_TYPE
        ] as CycleHeadType;
        const isInCycle = this.hasFlag(
            this.storage.nodeData,
            nodeOffset + SoALayout.Node.FLAGS,
            SoALayout.Node.Flags.IsInCycle,
        );

        if (isInCycle && headType === CycleHeadType.NONE) {
            const cycleState = this.cycles[cycleIdx];
            if (!cycleState) return NodeSignal.NONE;
            return cycleState.getBit(this.tick, cycleOffset)
                ? NodeSignal.ACTIVE
                : NodeSignal.NONE;
        }
        return this.storage.nodeData[
            nodeOffset + SoALayout.Node.SIGNAL
        ] as NodeSignal;
    }

    public setNodeSignal(nodeIdx: number, signal: NodeSignal): void {
        const nodeOffset = this.storage.inlineNodeOffset(nodeIdx);
        const extra32Offset = this.storage.inlineExtra32Offset(nodeIdx);
        const extra8Offset = this.storage.inlineExtra8Offset(nodeIdx);
        const flagsOffset = nodeOffset + SoALayout.Node.FLAGS;

        const chunkIdx =
            this.storage.extra32NodeData[
                extra32Offset + SoALayout.Extra32Node.CHUNK_IDX
            ];

        const headType = this.storage.extra8NodeData[
            extra8Offset + SoALayout.Extra8Node.HEAD_TYPE
        ] as CycleHeadType;
        const isInCycle = this.hasFlag(
            this.storage.nodeData,
            nodeOffset + SoALayout.Node.FLAGS,
            SoALayout.Node.Flags.IsInCycle,
        );

        if (isInCycle !== null && headType === CycleHeadType.NONE) {
            const cycleIdx =
                this.storage.extra32NodeData[
                    extra32Offset + SoALayout.Extra32Node.CYCLE_IDX
                ];
            const cycleOffset =
                this.storage.extra32NodeData[
                    extra32Offset + SoALayout.Extra32Node.CYCLE_OFFSET
                ];

            const cycleState = this.cycles[cycleIdx];
            if (!cycleState) return;
            if (signal === NodeSignal.NONE) {
                cycleState.clearBit(this.tick, cycleOffset);
            } else {
                cycleState.writeBit(this.tick, cycleOffset);
            }
        } else {
            const isChanged = this.hasFlag(
                this.storage.nodeData,
                flagsOffset,
                SoALayout.Node.Flags.IsChanged,
            );

            this.storage.nodeData[nodeOffset + SoALayout.Node.SIGNAL] = signal;
            this.markNodeChanged(nodeIdx);
            if (!isChanged) this.markNodeTempChanged(nodeIdx);
        }

        this.makeDirtyChunk(chunkIdx);
    }

    public updateChunk(chunk: Chunk): void {
        if (chunk.astIndex != null) {
            this.ensureChunkCapacity(chunk.astIndex + 1);
        }
    }

    public resetNodeSignal(node: GraphNode): void {
        const nodeOffset = this.storage.inlineNodeOffset(node.nodeIdx);
        this.storage.nodeData[nodeOffset + SoALayout.Node.SIGNAL] = 0;
        this.storage.nodeData[nodeOffset + SoALayout.Node.LAST_SIGNAL] = 0;
    }

    public markNodeChanged(nodeIdx: number): void {
        this.changedNodes.add(nodeIdx);
    }

    public markNodeTempChanged(nodeIdx: number): void {
        const nodeOffset = this.storage.inlineNodeOffset(nodeIdx);
        this.storage.nodeData[nodeOffset + SoALayout.Node.FLAGS] |=
            SoALayout.Node.Flags.IsChanged;
        this.tempChangedNodes.add(nodeIdx);
    }

    public makeDirtyChunk(chunkIdx: number): void {
        const offset = chunkIdx * SoALayout.Chunk.STRIDE;
        this.chunks[offset + SoALayout.Chunk.FLAGS] |=
            SoALayout.Chunk.Flags.IsDirty;
    }

    public makeUndirtyChunk(chunkIdx: number): void {
        const offset = chunkIdx * SoALayout.Chunk.STRIDE;
        this.chunks[offset + SoALayout.Chunk.FLAGS] &=
            ~SoALayout.Chunk.Flags.IsDirty;
    }

    public markAllChunksDirty(): void {
        for (let chunkIdx = 0; chunkIdx < this.chunkCount; chunkIdx++) {
            this.makeDirtyChunk(chunkIdx);
        }
    }

    public getDirtyChunks(markUndirty: boolean = false): number[] {
        const dirtyChunks: number[] = [];
        for (let chunkIdx = 0; chunkIdx < this.chunkCount; chunkIdx++) {
            const flagsOffset =
                chunkIdx * SoALayout.Chunk.STRIDE + SoALayout.Chunk.FLAGS;
            if (
                !this.hasFlag(
                    this.chunks,
                    flagsOffset,
                    SoALayout.Chunk.Flags.IsDirty,
                )
            )
                continue;

            if (markUndirty) {
                this.chunks[flagsOffset] &= ~SoALayout.Chunk.Flags.IsDirty;
            }
            dirtyChunks.push(chunkIdx);
        }
        return dirtyChunks;
    }

    public addCycle(cycle: GraphCycle): void {
        if (this.cycles[cycle.index]) return;
        this.cycles[cycle.index] = new SoACycleState(
            cycle.index,
            cycle.nodes.length,
        );
    }

    public removeCycle(cycle: GraphCycle): void {
        this.cycles[cycle.index] = null;
    }

    public makeSnapshot(): SoASnapshot {
        const snapshot = new SoASnapshot();
        snapshot.tick = this.tick;
        snapshot.breakPoint = this.breakPoint;

        const nodeCount = this.storage.count;
        const nodesSnapshots = new Array<SoANodeSnapshot>(nodeCount);
        for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
            const nodeSnapshot = new SoANodeSnapshot();
            const nodeOffset = this.storage.inlineNodeOffset(nodeIdx);

            nodeSnapshot.nodeIdx = nodeIdx;
            nodeSnapshot.signal = this.storage.nodeData[
                nodeOffset + SoALayout.Node.SIGNAL
            ] as NodeSignal;
            nodeSnapshot.lastSignal = this.storage.nodeData[
                nodeOffset + SoALayout.Node.LAST_SIGNAL
            ] as NodeSignal;
            nodeSnapshot.signalsCount =
                this.storage.nodeData[
                    nodeOffset + SoALayout.Node.SIGNALS_COUNT
                ];
            nodeSnapshot.blockedCount =
                this.storage.nodeData[
                    nodeOffset + SoALayout.Node.BLOCKED_COUNT
                ];

            nodesSnapshots[nodeIdx] = nodeSnapshot;
        }
        snapshot.nodes = nodesSnapshots;

        const chunksSnapshots = new Array<number>(this.chunkCount);
        for (let i = 0; i < this.chunkCount; i++) chunksSnapshots[i] = i;
        snapshot.chunks = chunksSnapshots;

        snapshot.changedNodes = Array.from(
            this.changedNodes.buffer.subarray(0, this.changedNodes.length),
        );
        snapshot.tempChangedNodes = Array.from(
            this.tempChangedNodes.buffer.subarray(
                0,
                this.tempChangedNodes.length,
            ),
        );

        const cyclesSnapshots: SoACycleSnapshot[] = [];
        for (let cycleIdx = 0; cycleIdx < this.cycles.length; cycleIdx++) {
            const cycleState = this.cycles[cycleIdx];
            if (!cycleState) continue;

            const cycleSnapshot = new SoACycleSnapshot(
                cycleIdx,
                cycleState.length,
            );
            cycleSnapshot.state.set(cycleState.state);
            cyclesSnapshots.push(cycleSnapshot);
        }
        snapshot.cycles = cyclesSnapshots;

        return snapshot;
    }

    public loadSnapshot(snapshot: SoASnapshot): SoASnapshot {
        this.tick = snapshot.tick;
        this.breakPoint = snapshot.breakPoint;

        this.ensureNodeCapacity(snapshot.nodes.length);
        this.ensureChunkCapacity(snapshot.chunks.length);

        for (let i = 0; i < snapshot.nodes.length; i++) {
            const nodeSnapshot = snapshot.nodes[i];
            const nodeOffset = this.storage.inlineNodeOffset(
                nodeSnapshot.nodeIdx,
            );

            this.storage.nodeData[nodeOffset + SoALayout.Node.SIGNAL] =
                nodeSnapshot.signal;
            this.storage.nodeData[nodeOffset + SoALayout.Node.LAST_SIGNAL] =
                nodeSnapshot.lastSignal;
            this.storage.nodeData[nodeOffset + SoALayout.Node.SIGNALS_COUNT] =
                nodeSnapshot.signalsCount;
            this.storage.nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT] =
                nodeSnapshot.blockedCount;
        }

        for (let i = 0; i < snapshot.chunks.length; i++) {
            this.makeDirtyChunk(snapshot.chunks[i]);
        }

        this.changedNodes.clear();
        this.tempChangedNodes.clear();

        for (let i = 0; i < snapshot.changedNodes.length; i++) {
            this.markNodeChanged(snapshot.changedNodes[i]);
        }
        for (let i = 0; i < snapshot.tempChangedNodes.length; i++) {
            this.markNodeTempChanged(snapshot.tempChangedNodes[i]);
        }

        for (let i = 0; i < snapshot.cycles.length; i++) {
            const cycleSnapshot = snapshot.cycles[i];
            const cycleState = this.cycles[cycleSnapshot.cycleIdx];
            if (cycleState && cycleState.length === cycleSnapshot.length) {
                cycleState.state.set(cycleSnapshot.state);
            }
        }

        return snapshot;
    }
}
