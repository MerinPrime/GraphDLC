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

    private _getNewRngState(): BigInt {
        const arr = new Uint32Array(2);
        crypto.getRandomValues(arr);

        return (BigInt(arr[0]) << 32n) | BigInt(arr[1]);
    }

    public constructor() {
        super();
        this.exports = instantiateRustEngine();
        this.exports.init(this._getNewRngState());
        this.stagingBufferPtr = this.exports.get_staging_buffer_ptr();
    }

    protected runTickInternal(): boolean {
        const breakPoint = this.exports.run_tick();
        return breakPoint;
    }

    protected runManyTicksInternal(ticksCount: number): boolean {
        const breakPoint = this.exports.run_many_ticks(ticksCount);
        return breakPoint;
    }

    public markAllChunksDirty(): void {
        this.exports.mark_all_chunks_dirty();
    }

    public setNodeSignalInternal(nodeIdx: number, signal: NodeSignal): void {
        this.exports.set_node_signal_export(nodeIdx, signal);
    }

    public getTick(): number {
        return this.exports.get_tick();
    }

    public getBreakpoint(doReset: boolean = false): number | false {
        const breakPointNode = this.exports.get_breakpoint(doReset);
        if (breakPointNode === -1) return false;
        return breakPointNode;
    }

    public isChanged(): boolean {
        return this.exports.is_changed() !== 0;
    }

    public getDirtyChunks(markUndirty: boolean): [...chunkIdx: number[]] {
        const count = this.exports.get_dirty_chunks_count();
        if (count === 0) {
            return [];
        }
        this.exports.copy_dirty_chunks(
            this.stagingBufferPtr,
            markUndirty ? 1 : 0,
        );
        const buffer = this.exports.memory.buffer as ArrayBuffer;
        const view = new Uint32Array(buffer, this.stagingBufferPtr, count);
        return Array.from(view);
    }

    public makeDirtyChunk(chunkIdx: number): void {
        this.exports.make_dirty_chunk_export(chunkIdx);
    }

    public makeUndirtyChunk(chunkIdx: number): void {
        this.exports.make_undirty_chunk_export(chunkIdx);
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        return this.exports.get_node_signal_export(nodeIdx) as NodeSignal;
    }

    public reset(): void {
        this.exports.reset_export();
        this.rewinder.reset();
        this.extraSignalsHistory.clear();
    }

    public onCycleBuild(cycle: GraphCycle): void {
        const buffer = this.exports.memory.buffer as ArrayBuffer;
        const stagingView = new Uint32Array(
            buffer,
            this.stagingBufferPtr,
            cycle.nodes.length + cycle.heads.length,
        );

        cycle.nodes.forEach((n, idx) => {
            stagingView[idx] = n.nodeIdx;
        });

        cycle.heads.forEach((n, idx) => {
            stagingView[cycle.nodes.length + idx] = n.nodeIdx;
        });

        this.exports.on_cycle_build_export(
            cycle.index,
            cycle.nodes.length,
            cycle.nodes.length,
            cycle.heads.length,
        );
    }

    public onCycleDismantle(cycle: GraphCycle): void {
        const buffer = this.exports.memory.buffer as ArrayBuffer;
        const stagingView = new Uint32Array(
            buffer,
            this.stagingBufferPtr,
            cycle.nodes.length + cycle.heads.length,
        );

        cycle.nodes.forEach((n, idx) => {
            stagingView[idx] = n.nodeIdx;
        });

        cycle.heads.forEach((n, idx) => {
            stagingView[cycle.nodes.length + idx] = n.nodeIdx;
        });

        this.exports.on_cycle_dismantle_export(
            cycle.index,
            cycle.nodes.length,
            cycle.heads.length,
        );
    }

    public updateNodeChange(node: GraphNode, oldLinks: GraphNode[]): void {
        const newLinks = node.links;

        const buffer = this.exports.memory.buffer as ArrayBuffer;
        const stagingView = new Uint32Array(
            buffer,
            this.stagingBufferPtr,
            oldLinks.length + newLinks.length,
        );

        oldLinks.forEach((n, idx) => {
            stagingView[idx] = n.nodeIdx;
        });

        newLinks.forEach((n, idx) => {
            stagingView[oldLinks.length + idx] = n.nodeIdx;
        });

        this.exports.update_node_change_export(
            node.nodeIdx,
            oldLinks.length,
            newLinks.length,
        );
    }

    public resetNodeSignal(node: GraphNode): void {
        this.exports.reset_node_signal(node.nodeIdx);
    }

    public updateNodeState(node: GraphNode): void {
        const nodeIdx = node.nodeIdx;
        this.exports.ensure_node_capacity_export(nodeIdx + 1);

        const links = node.links
            .filter(
                (linkedNode) =>
                    linkedNode.type !== NodeType.DETECTOR ||
                    node.type === NodeType.BLOCKER,
            )
            .map((linkedNode) => linkedNode.nodeIdx);

        const detectors = node.links
            .filter(
                (linkedNode) =>
                    linkedNode.type === NodeType.DETECTOR &&
                    linkedNode.detectedLink === node,
            )
            .map((node) => node.nodeIdx);

        const buffer = this.exports.memory.buffer as ArrayBuffer;
        const stagingView = new Uint32Array(
            buffer,
            this.stagingBufferPtr,
            links.length + detectors.length,
        );

        links.forEach((linkIdx, idx) => {
            stagingView[idx] = linkIdx;
        });
        detectors.forEach((detIdx, idx) => {
            stagingView[links.length + idx] = detIdx;
        });

        const isEntryPoint = NodeTypes.isEntryPoint(node.type);

        const isAdditionalUpdate = NodeTypes.isAdditionalUpdate(node.type);

        const cycleIdx = node.cycleRef ? node.cycleRef.index : -1;
        const cycleOffset = node.cycleRef ? node.cycleOffset : 0;
        const headType = node.cycleRef ? node.headType : 0;

        const detectedLinkIdx = node.detectedLink
            ? node.detectedLink.nodeIdx
            : -1;

        const blockedLinkIdx = node.blockedLink ? node.blockedLink.nodeIdx : -1;

        this.exports.update_node_state(
            nodeIdx,
            node.type,
            isEntryPoint ? 1 : 0,
            isAdditionalUpdate ? 1 : 0,
            node.isBreakpoint ? 1 : 0,
            cycleIdx,
            cycleOffset,
            headType,
            node.chunkIdx,
            links.length,
            detectors.length,
            detectedLinkIdx,
            blockedLinkIdx,
        );
    }

    public updateChunk(chunk: Chunk): void {
        if (chunk.astIndex === undefined || chunk.astIndex === null) return;
        this.exports.ensure_chunk_capacity_export(chunk.astIndex + 1);
    }

    public clear(): void {
        this.exports.clear(this._getNewRngState());
    }

    protected makeSnapshot(): NativeSnapshot {
        const ptr = this.exports.serialize_state_export();
        const len = this.exports.get_serialized_length();
        const buffer = this.exports.memory.buffer as ArrayBuffer;

        const wasmView = new Uint8Array(buffer, ptr, len);
        const data = new Uint8Array(len);
        data.set(wasmView);

        return {
            tick: this.getTick(),
            data,
        };
    }

    protected loadSnapshot(snapshot: NativeSnapshot): void {
        const buffer = this.exports.memory.buffer as ArrayBuffer;
        const wasmView = new Uint8Array(
            buffer,
            this.stagingBufferPtr,
            snapshot.data.length,
        );
        wasmView.set(snapshot.data);

        this.exports.deserialize_state_export(snapshot.data.length);
    }
}
