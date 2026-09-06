import type { GraphCycle } from 'src/core/graph/ast/cycle/CycleTypes';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { BaseEngine, type EngineTypes } from '../core/types/BaseEngine';
import type { NativeSnapshot } from './NativeSnapshot';
import { NativeState } from './NativeState';
import { RustWrapper } from './RustWrapper';

interface NativeEngineTypes extends EngineTypes {
    Snapshot: NativeSnapshot;
    State: NativeState;
}

export class NativeEngine extends BaseEngine<NativeEngineTypes> {
    protected readonly state: NativeState;

    private readonly wrapper: RustWrapper;

    public constructor() {
        super();
        this.wrapper = new RustWrapper();
        this.wrapper.init();
        this.state = new NativeState(this.wrapper);
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
}
