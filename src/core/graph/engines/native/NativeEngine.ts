import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { GraphCycle } from 'src/core/graph/ast/cycle/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import type { NodeSignal } from '../core/NodeSignal';
import { NodeType, NodeTypes } from '../core/NodeType';
import { BaseEngine, type EngineTypes } from '../core/types/BaseEngine';
import type { ISnapshot } from '../core/types/ISnapshot';
import { instantiateRustEngine } from './loader';
import type { RustEngineExports } from './types';

export interface NativeSnapshot extends ISnapshot {
    tick: number;
    data: Uint8Array;
}

interface NativeEngineTypes extends EngineTypes {
    Snapshot: NativeSnapshot;
}

export class NativeEngine extends BaseEngine<NativeEngineTypes> {
    private readonly exports: RustEngineExports;
    private readonly stagingBufferPtr: number;

    public constructor() {
        super();
        this.exports = instantiateRustEngine();
        this.exports.init(this.generateRngSeed());
        this.stagingBufferPtr = this.exports.get_staging_buffer_ptr();
    }

    private get memoryBuffer(): ArrayBuffer {
        return (this.exports.memory as any).buffer as ArrayBuffer;
    }

    private getStagingUint32View(length: number): Uint32Array {
        return new Uint32Array(
            this.memoryBuffer,
            this.stagingBufferPtr,
            length,
        );
    }

    private getStagingUint8View(length: number): Uint8Array {
        return new Uint8Array(this.memoryBuffer, this.stagingBufferPtr, length);
    }

    private writeNodesToStaging(...nodeGroups: GraphNode[][]): number {
        let totalCount = 0;
        for (let i = 0; i < nodeGroups.length; i++) {
            totalCount += nodeGroups[i].length;
        }

        const view = this.getStagingUint32View(totalCount);
        let offset = 0;

        for (let g = 0; g < nodeGroups.length; g++) {
            const group = nodeGroups[g];
            for (let i = 0; i < group.length; i++) {
                view[offset++] = group[i].nodeIdx;
            }
        }

        return totalCount;
    }

    private generateRngSeed(): bigint {
        const arr = new Uint32Array(2);
        crypto.getRandomValues(arr);
        return (BigInt(arr[0]) << 32n) | BigInt(arr[1]);
    }

    protected runTickInternal(): boolean {
        return this.exports.run_tick();
    }

    protected runManyTicksInternal(ticksCount: number): boolean {
        return this.exports.run_many_ticks(ticksCount);
    }

    public getTick(): number {
        return this.exports.get_tick();
    }

    public getBreakpoint(doReset: boolean = false): number | false {
        const breakPointNode = this.exports.get_breakpoint(doReset);
        return breakPointNode === -1 ? false : breakPointNode;
    }

    public isChanged(): boolean {
        return this.exports.is_changed() !== 0;
    }

    public reset(): void {
        this.exports.reset_export();
        this.rewinder.reset();
        this.extraSignalsHistory.clear();
    }

    public clear(): void {
        this.exports.clear(this.generateRngSeed());
    }

    public markAllChunksDirty(): void {
        this.exports.mark_all_chunks_dirty();
    }

    public makeDirtyChunk(chunkIdx: number): void {
        this.exports.make_dirty_chunk_export(chunkIdx);
    }

    public makeUndirtyChunk(chunkIdx: number): void {
        this.exports.make_undirty_chunk_export(chunkIdx);
    }

    public updateChunk(chunk: Chunk): void {
        if (chunk.astIndex != null) {
            this.exports.ensure_chunk_capacity_export(chunk.astIndex + 1);
        }
    }

    public getDirtyChunks(markUndirty: boolean): number[] {
        const count = this.exports.get_dirty_chunks_count();
        if (count === 0) return [];

        this.exports.copy_dirty_chunks(
            this.stagingBufferPtr,
            markUndirty ? 1 : 0,
        );
        const view = this.getStagingUint32View(count);
        return Array.from(view);
    }

    public setNodeSignalInternal(nodeIdx: number, signal: NodeSignal): void {
        this.exports.set_node_signal_export(nodeIdx, signal);
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        return this.exports.get_node_signal_export(nodeIdx) as NodeSignal;
    }

    public resetNodeSignal(node: GraphNode): void {
        this.exports.reset_node_signal(node.nodeIdx);
    }

    public onCycleBuild(cycle: GraphCycle): void {
        this.writeNodesToStaging(cycle.nodes, cycle.heads);

        this.exports.on_cycle_build_export(
            cycle.index,
            cycle.nodes.length,
            cycle.nodes.length,
            cycle.heads.length,
        );
    }

    public onCycleDismantle(cycle: GraphCycle): void {
        this.writeNodesToStaging(cycle.nodes, cycle.heads);

        this.exports.on_cycle_dismantle_export(
            cycle.index,
            cycle.nodes.length,
            cycle.heads.length,
        );
    }

    public updateNodeChange(node: GraphNode, oldLinks: GraphNode[]): void {
        this.writeNodesToStaging(oldLinks, node.links);

        this.exports.update_node_change_export(
            node.nodeIdx,
            oldLinks.length,
            node.links.length,
        );
    }

    public updateNodeState(node: GraphNode): void {
        const nodeIdx = node.nodeIdx;
        this.exports.ensure_node_capacity_export(nodeIdx + 1);

        const linkIndices: number[] = [];
        const detectorIndices: number[] = [];

        for (let i = 0; i < node.links.length; i++) {
            const linkedNode = node.links[i];
            const isDetector = linkedNode.type === NodeType.DETECTOR;

            if (isDetector && node.type !== NodeType.BLOCKER) {
                if (linkedNode.detectedLink === node) {
                    detectorIndices.push(linkedNode.nodeIdx);
                }
            } else {
                linkIndices.push(linkedNode.nodeIdx);
            }
        }

        const totalCount = linkIndices.length + detectorIndices.length;
        const stagingView = this.getStagingUint32View(totalCount);

        stagingView.set(linkIndices, 0);
        stagingView.set(detectorIndices, linkIndices.length);

        const cycleRef = node.cycleRef;

        this.exports.update_node_state(
            nodeIdx,
            node.type,
            NodeTypes.isEntryPoint(node.type) ? 1 : 0,
            NodeTypes.isAdditionalUpdate(node.type) ? 1 : 0,
            node.isBreakpoint ? 1 : 0,
            cycleRef ? cycleRef.index : -1,
            cycleRef ? node.cycleOffset : 0,
            cycleRef ? node.headType : 0,
            node.chunkIdx,
            linkIndices.length,
            detectorIndices.length,
            node.detectedLink ? node.detectedLink.nodeIdx : -1,
            node.blockedLink ? node.blockedLink.nodeIdx : -1,
        );
    }

    protected makeSnapshot(): NativeSnapshot {
        const ptr = this.exports.serialize_state_export();
        const len = this.exports.get_serialized_length();

        const wasmView = new Uint8Array(this.memoryBuffer, ptr, len);
        const data = new Uint8Array(len);
        data.set(wasmView);

        return {
            tick: this.getTick(),
            data,
        };
    }

    protected loadSnapshot(snapshot: NativeSnapshot): void {
        const wasmView = this.getStagingUint8View(snapshot.data.length);
        wasmView.set(snapshot.data);

        this.exports.deserialize_state_export(snapshot.data.length);
    }
}
