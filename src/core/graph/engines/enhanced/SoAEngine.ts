import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { EnableSnapshotsSetting } from 'src/core/settings/instances/performance/EnableSnapshotsSetting';
import type { GraphCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { StateRewinder } from '../core/StateRewinder';
import type { IEngine } from '../core/types';
import { SoALayout } from './SoALayout';
import type { SoASnapshot } from './SoASnapshot';
import { SoAGraphState } from './SoAState';
import { SoAStateSynchronizer } from './SoAStateSynchonizer';
import { SoAGraphUpdater } from './SoAUpdater';

export class SoAEngine implements IEngine {
    private readonly state: SoAGraphState = new SoAGraphState();
    private readonly updater: SoAGraphUpdater = new SoAGraphUpdater();
    private readonly synchronizer: SoAStateSynchronizer =
        new SoAStateSynchronizer(this.updater);
    private readonly rewinder: StateRewinder<SoASnapshot> = new StateRewinder();

    private saveSnapshots: boolean;

    public constructor() {
        this.saveSnapshots = EnableSnapshotsSetting.value;
        EnableSnapshotsSetting.onChange.add((newValue) => {
            this.saveSnapshots = newValue;
        });
    }

    public runTick(): void {
        if (this.saveSnapshots) {
            if (this.rewinder.canDoSnapshot()) {
                this.rewinder.saveSnapshot(this.state.makeSnapshot());
            }
        }
        this.updater.updateState(this.state);
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

        this.state.loadSnapshot(closestSnapshot);
        for (let i = 0; i < stepsToSimulate; i++) {
            this.updater.updateState(this.state);
        }
    }

    public getTick(): number {
        return this.state.tick;
    }

    public resetBreakpoint(): boolean {
        const oldBreakpoint = this.state.breakPoint;
        this.state.breakPoint = false;
        return oldBreakpoint;
    }

    public isChanged(): boolean {
        return this.state.changedNodes.length !== 0;
    }

    public getDirtyChunks(markUndirty: boolean): [...chunkIdx: number[]] {
        return this.state.getDirtyChunks(markUndirty);
    }

    public makeDirtyChunk(chunkIdx: number): void {
        this.state.makeDirtyChunk(chunkIdx);
    }

    public makeUndirtyChunk(chunkIdx: number): void {
        this.state.makeUndirtyChunk(chunkIdx);
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        return this.state.getNodeSignal(nodeIdx);
    }

    public reset(): void {
        this.state.reset();
        this.rewinder.reset();
    }

    public onCycleBuild(cycle: GraphCycle): void {
        this.synchronizer.onCycleBuild(this.state, cycle);
    }

    public onCycleDismantle(cycle: GraphCycle): void {
        this.synchronizer.onCycleDismantle(this.state, cycle);
    }

    public updateNodeChange(node: GraphNode, oldLinks: GraphNode[]): void {
        this.synchronizer.updateNodeChange(
            this.state,
            node,
            oldLinks,
            node.links,
        );
    }

    public updateNodeState(
        node: GraphNode,
        resetSignal: boolean = false,
    ): void {
        this.state.updateNodeState(node, resetSignal);
    }

    public updateChunk(chunk: Chunk): void {
        this.state.updateChunk(chunk);
    }

    public doPressButton(nodeIdx: number, state: boolean): void {
        const newSignal = state ? NodeSignal.ACTIVE : NodeSignal.NONE;
        const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
        const extraNodeOffset = nodeIdx * SoALayout.Extra8Node.STRIDE;
        const chunkIdx =
            this.state.extra32NodeData[
                extraNodeOffset + SoALayout.Extra32Node.CHUNK_IDX
            ];

        this.state.nodeData[nodeOffset + SoALayout.Node.SIGNAL] = newSignal;
        this.updater.markNodeAsChanged(this.state, nodeIdx);
        this.state.changedNodes.add(nodeIdx);
        this.state.makeDirtyChunk(chunkIdx);
    }

    public clear(): void {
        this.state.clear();
    }
}
