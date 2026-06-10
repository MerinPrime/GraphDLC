import { EnableSnapshotsSetting } from 'src/core/settings/instances/other/EnableSnapshotsSetting';
import type { RawCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { StateRewinder } from '../core/StateRewinder';
import type { IEngine } from '../core/types';
import type { RawSnapshot } from './RawSnapshot';
import { RawGraphState } from './RawState';
import { RawStateSynchronizer } from './RawStateSynchonizer';
import { RawGraphUpdater } from './RawUpdater';

const SNAPSHOT_INTERVAL = 1000;

export class RawEngine implements IEngine {
    private readonly state: RawGraphState = new RawGraphState();
    private readonly updater: RawGraphUpdater = new RawGraphUpdater();
    private readonly synchronizer: RawStateSynchronizer =
        new RawStateSynchronizer(this.updater);
    private readonly rewinder: StateRewinder<RawSnapshot> = new StateRewinder(
        SNAPSHOT_INTERVAL,
    );

    private saveSnapshots: boolean;

    public constructor() {
        this.saveSnapshots = EnableSnapshotsSetting.value;
        EnableSnapshotsSetting.onChange.add((newValue) => {
            this.saveSnapshots = newValue;
        });
    }

    public runTick(): void {
        if (this.saveSnapshots) {
            if (this.state.tick % this.rewinder.interval === 0) {
                this.rewinder.saveSnapshot(this.state.makeSnapshot());
            }
        }
        this.updater.updateState(this.state);
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

        this.state.loadSnapshot(closestSnapshot);
        for (let i = 0; i < stepsToSimulate; i++) {
            this.updater.updateState(this.state);
        }
    }

    public getTick(): number {
        return this.state.tick;
    }

    public reset(): void {
        this.state.reset();
        this.rewinder.reset();
    }

    public onCycleBuild(cycle: RawCycle): void {
        this.synchronizer.onCycleBuild(this.state, cycle);
    }

    public onCycleDismantle(cycle: RawCycle): void {
        this.synchronizer.onCycleDismantle(this.state, cycle);
    }

    public updateNodeChange(
        node: GraphNode,
        oldNextFull: GraphNode[],
        next: GraphNode[],
    ): void {
        this.synchronizer.updateNodeChange(this.state, node, oldNextFull, next);
    }

    public doPressButton(astIdx: number, state: boolean): void {
        const astState = this.state.getNode(astIdx);
        astState.signal = state ? NodeSignal.ACTIVE : NodeSignal.NONE;
        this.updater.markNodeAsChanged(this.state, astState);
        this.state.changedNodes.push(astState);
        this.state.makeDirtyChunk(astState.node.chunkIdx);
    }
}
