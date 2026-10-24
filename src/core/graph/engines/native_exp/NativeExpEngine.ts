import type { GraphCycle } from 'src/core/graph/ast/cycle/types';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { BaseEngine, type EngineTypes } from '../core/types/BaseEngine';
import type { EngineCapabilities } from '../core/types/EngineCapabilities';
import type { NativeExpSnapshot } from './NativeExpSnapshot';
import { NativeExpState } from './NativeExpState';
import { RustExpWrapper } from './RustExpWrapper';

interface NativeExpEngineTypes extends EngineTypes {
    Snapshot: NativeExpSnapshot;
    State: NativeExpState;
}

export class NativeExpEngine extends BaseEngine<NativeExpEngineTypes> {
    public override readonly capabilities: EngineCapabilities = {
        canWriteAndClear: true,
        bulkRender: true,
    };

    protected readonly state: NativeExpState;

    private readonly wrapper: RustExpWrapper;

    public constructor() {
        super();
        this.wrapper = new RustExpWrapper();
        this.wrapper.init();
        this.state = new NativeExpState(this.wrapper);
    }

    protected runTickInternal(): boolean {
        return this.wrapper.runTick();
    }

    protected runManyTicksInternal(ticksCount: number): boolean {
        return this.wrapper.runManyTicks(ticksCount);
    }

    public addCycle(cycle: GraphCycle): void {
        this.wrapper.onCycleBuild(cycle);
    }

    public removeCycle(cycle: GraphCycle): void {
        this.wrapper.onCycleDismantle(cycle);
    }

    public updateNodeState(_graph: Graph, node: GraphNode): void {
        this.wrapper.updateNodeState(node);
    }

    public setNodeBreakpoint(nodeIdx: number, isBreakpoint: boolean): void {
        this.wrapper.setNodeBreakpoint(nodeIdx, isBreakpoint);
    }

    public override fillNodeSignalsBulk(nodeIndices: Uint32Array): Uint8Array {
        return this.wrapper.fillNodeSignalsBulk(nodeIndices);
    }

    public override fillChunksSignalsBulk(
        chunkIndices: Uint32Array | number[],
    ): Uint8Array {
        return this.wrapper.fillChunksSignalsBulk(chunkIndices);
    }
}
