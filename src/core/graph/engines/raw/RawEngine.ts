import type { GraphCycle } from 'src/core/graph/ast/cycle/CycleTypes';
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
}
