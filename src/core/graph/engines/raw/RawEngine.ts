import type { GraphCycle } from 'src/core/graph/ast/cycle/types';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { BaseEngine, type EngineTypes } from '../core/types/BaseEngine';
import type { RawSnapshot } from './RawSnapshot';
import { RawGraphState } from './RawState';
import { RawStateSynchronizer } from './RawStateSynchronizer';
import { RawGraphUpdater } from './RawUpdater';

interface RawEngineTypes extends EngineTypes {
    Snapshot: RawSnapshot;
    State: RawGraphState;
}

export class RawEngine extends BaseEngine<RawEngineTypes> {
    public readonly state = new RawGraphState();
    private readonly updater: RawGraphUpdater = new RawGraphUpdater();
    private readonly synchronizer: RawStateSynchronizer =
        new RawStateSynchronizer(this.updater);

    protected runTickInternal(): boolean {
        this.updater.updateState(this.state);
        return this.state.breakPoint;
    }

    public addCycle(cycle: GraphCycle): void {
        this.synchronizer.onCycleBuild(this.state, cycle);
    }

    public removeCycle(cycle: GraphCycle): void {
        this.synchronizer.onCycleDismantle(this.state, cycle);
    }

    public updateNodeState(graph: Graph, node: GraphNode): void {
        this.updater.updateNodeState(graph, this.state, node);
    }

    public setNodeBreakpoint(nodeIdx: number, isBreakpoint: boolean): void {
        this.updater.setNodeBreakpoint(this.state, nodeIdx, isBreakpoint);
    }

    private bulkSignalsBuffer = new Uint8Array(1024);

    public override fillNodeSignalsBulk(nodeIndices: Uint32Array): Uint8Array {
        const count = nodeIndices.length;
        if (this.bulkSignalsBuffer.length < count) {
            this.bulkSignalsBuffer = new Uint8Array(
                Math.max(count, this.bulkSignalsBuffer.length * 2),
            );
        }
        const state = this.state;
        const out = this.bulkSignalsBuffer;
        for (let i = 0; i < count; i++) {
            const idx = nodeIndices[i];
            out[i] = idx === 0xffffffff ? 0 : state.getNodeSignal(idx);
        }
        return out.subarray(0, count);
    }

    public override fillChunksSignalsBulk(
        chunkIndices: Uint32Array | number[],
    ): Uint8Array {
        const count = chunkIndices.length;
        const totalArrows = count * 256;
        if (this.bulkSignalsBuffer.length < totalArrows) {
            this.bulkSignalsBuffer = new Uint8Array(
                Math.max(totalArrows, this.bulkSignalsBuffer.length * 2),
            );
        }
        const state = this.state;
        const out = this.bulkSignalsBuffer;
        let offset = 0;
        for (let i = 0; i < count; i++) {
            const chunkIdx = chunkIndices[i];
            const chunk = state.getChunk(chunkIdx);
            if (chunk) {
                const nodes = chunk.nodes;
                for (let j = 0; j < 256; j++) {
                    const nodeIdx = nodes[j];
                    out[offset++] =
                        nodeIdx === 0xffffffff
                            ? 0
                            : state.getNodeSignal(nodeIdx);
                }
            } else {
                for (let j = 0; j < 256; j++) {
                    out[offset++] = 0;
                }
            }
        }
        return this.bulkSignalsBuffer.subarray(0, totalArrows);
    }
}
