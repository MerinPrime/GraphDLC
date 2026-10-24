import type { GraphCycle } from '../../ast/cycle/types';
import type { GraphNode } from '../../ast/GraphNode';
import type { GraphPath } from '../../ast/path/types';
import type { NodeSignal } from '../core/NodeSignal';
import { NodeType, NodeTypes } from '../core/NodeType';
import { getRustEngine } from './loader';
import type { NativeExpSnapshot } from './NativeExpSnapshot';
import type { RustEngineExports } from './types';

export class RustExpWrapper {
    private readonly exports: RustEngineExports;
    private readonly stagingBufferPtr: number;

    public constructor() {
        this.exports = getRustEngine();
        this.stagingBufferPtr = this.exports.get_staging_buffer_ptr();
    }

    private get memoryBuffer(): ArrayBuffer {
        return this.exports.memory.buffer as ArrayBuffer;
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

    private writeNodesToStaging(
        ...nodeGroups: (readonly GraphNode[])[]
    ): number {
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

    public init(): void {
        this.exports.init();
    }

    public clear(): void {
        this.exports.clear();
    }

    public setSeed(seed: number): void {
        this.exports.set_seed(seed);
    }

    public updateNodeState(node: GraphNode): void {
        const nodeIdx = node.nodeIdx;

        const links: GraphNode[] = [];
        const detectors: GraphNode[] = [];

        for (let i = 0; i < node.links.length; i++) {
            const linkedNode = node.links[i];
            const isDetector = linkedNode.type === NodeType.DETECTOR;

            if (isDetector && node.type !== NodeType.BLOCKER) {
                if (linkedNode.detectedLink === node) {
                    detectors.push(linkedNode);
                }
            } else {
                links.push(linkedNode);
            }
        }

        this.writeNodesToStaging(links, detectors);

        const cycleRef = node.cycleRef;
        const localIdx = (node.localY << 4) | node.localX;

        this.exports.update_node_state(
            nodeIdx,
            node.posHash,
            node.type,
            NodeTypes.isEntryPoint(node.type) ? 1 : 0,
            NodeTypes.isAdditionalUpdate(node.type) ? 1 : 0,
            cycleRef ? cycleRef.index : -1,
            cycleRef ? node.cycleOffset : 0,
            cycleRef ? node.headType : 0,
            node.chunkIdx,
            localIdx,
            links.length,
            detectors.length,
            node.detectedLink ? node.detectedLink.nodeIdx : -1,
            node.blockedLink ? node.blockedLink.nodeIdx : -1,
        );
    }

    public registerChunk(chunkIdx: number, x: number, y: number): void {
        this.exports.register_chunk_export(chunkIdx, x, y);
    }

    public setNodeBreakpoint(nodeIdx: number, isBreakpoint: boolean): void {
        this.exports.set_node_breakpoint(nodeIdx, isBreakpoint);
    }

    public ensureNodeCapacity(count: number): void {
        this.exports.ensure_node_capacity_export(count);
    }

    public ensureChunkCapacity(count: number): void {
        this.exports.ensure_chunk_capacity_export(count);
    }

    public reset(): void {
        this.exports.reset_export();
    }

    public runTick(): boolean {
        return this.exports.run_tick();
    }

    public runManyTicks(ticksCount: number): boolean {
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

    public markAllChunksDirty(): void {
        this.exports.mark_all_chunks_dirty();
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

    public getNodeSignalsCount(nodeIdx: number): number {
        return this.exports.get_node_signals_count_export(nodeIdx);
    }

    public getNodeLinks(nodeIdx: number): number[] {
        const count = this.exports.get_node_links_count_export(nodeIdx);
        const links: number[] = [];
        for (let i = 0; i < count; i++) {
            links.push(this.exports.get_node_link_export(nodeIdx, i));
        }
        return links;
    }

    public fillNodeSignalsBulk(nodeIndices: Uint32Array): Uint8Array {
        const count = nodeIndices.length;
        const staging32 = this.getStagingUint32View(count);
        staging32.set(nodeIndices);
        this.exports.get_nodes_signals_bulk_export(count);
        return this.getStagingUint8View(count);
    }

    public fillChunksSignalsBulk(
        chunkIndices: Uint32Array | number[],
    ): Uint8Array {
        const count = chunkIndices.length;
        const staging32 = this.getStagingUint32View(count);
        staging32.set(chunkIndices);
        this.exports.get_chunks_signals_bulk_export(count);
        return this.getStagingUint8View(count * 256);
    }

    public getDirtyChunksCount(): number {
        return this.exports.get_dirty_chunks_count();
    }

    public copyDirtyChunks(outPtr: number, markUndirty: boolean): number {
        return this.exports.copy_dirty_chunks(outPtr, markUndirty ? 1 : 0);
    }

    public setNodeSignal(nodeIdx: number, signal: NodeSignal): void {
        this.exports.set_node_signal_export(nodeIdx, signal);
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
        this.writeNodesToStaging(cycle.nodes, cycle.extraNodes, cycle.heads);

        this.exports.on_cycle_dismantle_export(
            cycle.index,
            cycle.nodes.length + cycle.extraNodes.length,
            cycle.heads.length,
        );
    }

    public onPathBuild(path: GraphPath): void {
        let maxDelay = 0;
        for (let i = 0; i < path.targets.length; i++) {
            if (path.targets[i].delay > maxDelay) {
                maxDelay = path.targets[i].delay;
            }
        }
        for (let i = 0; i < path.nodes.length; i++) {
            const dist = path.nodes[i].path?.distanceFromSource ?? 1;
            if (dist > maxDelay) {
                maxDelay = dist;
            }
        }

        const targets = path.targets;
        const nodes = path.nodes;
        const staging = this.getStagingUint32View(
            targets.length * 2 + nodes.length * 2,
        );

        let offset = 0;
        for (let i = 0; i < targets.length; i++) {
            staging[offset++] = targets[i].node.nodeIdx;
            staging[offset++] = targets[i].delay;
        }
        for (let i = 0; i < nodes.length; i++) {
            staging[offset++] = nodes[i].nodeIdx;
            staging[offset++] = nodes[i].path?.distanceFromSource ?? 1;
        }

        this.exports.on_path_build_export(
            path.index,
            path.sourceNode.nodeIdx,
            maxDelay,
            targets.length,
            nodes.length,
        );
    }

    public onPathDismantle(path: GraphPath): void {
        const nodes = path.nodes;
        const targets = path.targets;

        const otherPathFirstNodes = new Set<number>();
        for (let i = 0; i < path.sourceNode.links.length; i++) {
            const next = path.sourceNode.links[i];
            if (
                next.path &&
                next.path.ref !== path &&
                next.path.ref.sourceNode === path.sourceNode &&
                next.path.distanceFromSource === 1
            ) {
                otherPathFirstNodes.add(next.nodeIdx);
            }
        }

        const remainingSourceLinks: number[] = [];
        for (let i = 0; i < path.sourceNode.links.length; i++) {
            const next = path.sourceNode.links[i];
            const isDetector = next.type === NodeType.DETECTOR;
            if (
                (!isDetector || path.sourceNode.type === NodeType.BLOCKER) &&
                !otherPathFirstNodes.has(next.nodeIdx)
            ) {
                remainingSourceLinks.push(next.nodeIdx);
            }
        }

        const totalCount =
            nodes.length + targets.length + remainingSourceLinks.length;
        const staging = this.getStagingUint32View(totalCount);

        let offset = 0;
        for (let i = 0; i < nodes.length; i++) {
            staging[offset++] = nodes[i].nodeIdx;
        }
        for (let i = 0; i < targets.length; i++) {
            staging[offset++] = targets[i].node.nodeIdx;
        }
        for (let i = 0; i < remainingSourceLinks.length; i++) {
            staging[offset++] = remainingSourceLinks[i];
        }

        this.exports.on_path_dismantle_export(
            path.index,
            path.sourceNode.nodeIdx,
            nodes.length,
            targets.length,
            remainingSourceLinks.length,
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

    public serializeState(): number {
        return this.exports.serialize_state_export();
    }

    public getSerializedLength(): number {
        return this.exports.get_serialized_length();
    }

    public deserializeState(len: number): void {
        this.exports.deserialize_state_export(len);
    }

    public getDirtyChunks(markUndirty: boolean): number[] {
        const count = this.copyDirtyChunks(this.stagingBufferPtr, markUndirty);

        if (count === 0) {
            return [];
        }

        const view = this.getStagingUint32View(count);

        return Array.from(view);
    }

    public getDirtyChunksInViewport(
        markUndirty: boolean,
        minChunkX: number,
        minChunkY: number,
        maxChunkX: number,
        maxChunkY: number,
    ): number[] {
        const count = this.exports.copy_dirty_chunks_in_viewport(
            this.stagingBufferPtr,
            markUndirty ? 1 : 0,
            minChunkX,
            minChunkY,
            maxChunkX,
            maxChunkY,
        );

        if (count === 0) {
            return [];
        }

        const view = this.getStagingUint32View(count);
        return Array.from(view);
    }

    public makeSnapshot(): NativeExpSnapshot {
        const ptr = this.serializeState();
        const len = this.getSerializedLength();

        const wasmView = new Uint8Array(this.memoryBuffer, ptr, len);

        const data = new Uint8Array(len);
        data.set(wasmView);

        return {
            tick: this.getTick(),
            data,
        };
    }

    public loadSnapshot(snapshot: NativeExpSnapshot): void {
        const wasmView = this.getStagingUint8View(snapshot.data.length);

        wasmView.set(snapshot.data);

        this.deserializeState(snapshot.data.length);
    }
}
