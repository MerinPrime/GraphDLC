import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { EnableSnapshotsSetting } from 'src/core/settings/instances/performance/EnableSnapshotsSetting';
import type { GraphCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { NodeType } from '../core/NodeType';
import { StateRewinder } from '../core/StateRewinder';
import type { IEngine, ISnapshot } from '../core/types';
import { instantiateRustEngine } from './loader';
import type { RustEngineExports } from './types';

export interface NativeSnapshot extends ISnapshot {
    tick: number;
    data: Uint8Array;
}

export class NativeEngine implements IEngine {
    private readonly exports: RustEngineExports;
    private readonly stagingBufferPtr: number;
    private readonly rewinder: StateRewinder<NativeSnapshot> =
        new StateRewinder();

    private extraRewindNodes: Set<number> = new Set();
    private extraSignalsHistory: Map<number, Map<number, number>> = new Map();

    private saveSnapshots: boolean;

    public constructor() {
        this.exports = instantiateRustEngine();
        this.exports.init();
        this.stagingBufferPtr = this.exports.get_staging_buffer_ptr();

        this.saveSnapshots = EnableSnapshotsSetting.value;
        EnableSnapshotsSetting.onChange.add((newValue) => {
            this.saveSnapshots = newValue;
        });
    }

    public runTick(): void {
        if (this.saveSnapshots) {
            const signals = new Map<number, number>();
            for (const nodeIdx of this.extraRewindNodes) {
                const signal = this.getNodeSignal(nodeIdx);
                if (signal === NodeSignal.NONE) {
                    continue;
                }
                signals.set(nodeIdx, signal);
            }
            this.extraSignalsHistory.set(this.getTick(), signals);

            if (this.rewinder.canDoSnapshot(this.getTick())) {
                this.rewinder.saveSnapshot(this.makeSnapshot());

                const oldestTick = this.rewinder.getOldestSnapshotTick();
                for (const tick of this.extraSignalsHistory.keys()) {
                    if (tick < oldestTick) {
                        this.extraSignalsHistory.delete(tick);
                    }
                }
            }
        }
        this.exports.run_tick();
    }

    public runManyTicks(ticksCount: number): void {
        for (let i = 0; i < ticksCount; i++) {
            this.runTick();
        }
    }

    public rewindToTick(targetTick: number): void {
        const closestSnapshot = this.rewinder.findClosestSnapshot(targetTick);
        if (!closestSnapshot) {
            return;
        }

        const stepsToSimulate = targetTick - closestSnapshot.tick;
        if (stepsToSimulate > 1000000) {
            this.rewinder.reset();
            return;
        }

        this.loadSnapshot(closestSnapshot);
        for (let i = 0; i < stepsToSimulate; i++) {
            const currentTick = this.getTick();
            const recordedSignals = this.extraSignalsHistory.get(currentTick);
            if (recordedSignals) {
                for (const nodeIdx of this.extraRewindNodes) {
                    const signal =
                        recordedSignals.get(nodeIdx) ?? NodeSignal.NONE;
                    this.exports.set_node_signal_export(nodeIdx, signal);
                }
            }
            this.exports.run_tick();
        }
    }

    public getTick(): number {
        return this.exports.get_tick();
    }

    public resetBreakpoint(): boolean {
        return this.exports.reset_breakpoint() !== 0;
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

    public setExtraRewindNodes(nodeIndices: Set<number>): void {
        this.extraRewindNodes = nodeIndices;
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

    public updateNodeState(
        node: GraphNode,
        resetSignal: boolean = false,
    ): void {
        const nodeIdx = node.nodeIdx;
        this.exports.ensure_node_capacity_export(nodeIdx + 1);

        const links = node.links
            .filter((linkedNode) => linkedNode.type !== NodeType.DETECTOR)
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

        const isEntryPoint =
            node.type === NodeType.SOURCE ||
            node.type === NodeType.IMPULSE ||
            node.type === NodeType.LOGIC_NOT ||
            node.type === NodeType.BUTTON ||
            node.type === NodeType.DIRECTIONAL_BUTTON;

        const isAdditionalUpdate =
            node.type === NodeType.DELAY ||
            node.type === NodeType.IMPULSE ||
            node.type === NodeType.FLIP_FLOP ||
            node.type === NodeType.RANDOM;

        const cycleIdx = node.cycleRef ? node.cycleRef.index : -1;
        const cycleOffset = node.cycleRef ? node.cycleOffset : 0;
        const headType = node.cycleRef ? node.headType : 0;

        const detectedLinkIdx = node.detectedLink
            ? node.detectedLink.nodeIdx
            : -1;

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
            resetSignal ? 1 : 0,
        );
    }

    public updateChunk(chunk: Chunk): void {
        if (chunk.astIndex === undefined || chunk.astIndex === null) return;
        this.exports.ensure_chunk_capacity_export(chunk.astIndex + 1);
    }

    public doPressButton(nodeIdx: number, state: boolean): void {
        this.exports.do_press_button_export(nodeIdx, state ? 1 : 0);
    }

    public clear(): void {
        this.exports.clear();
    }

    private makeSnapshot(): NativeSnapshot {
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

    private loadSnapshot(snapshot: NativeSnapshot): void {
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
