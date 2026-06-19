import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { EnableSnapshotsSetting } from 'src/core/settings/instances/performance/EnableSnapshotsSetting';
import type { GraphCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { StateRewinder } from '../core/StateRewinder';
import type { IEngine } from '../core/types';
import type { RawSnapshot } from './RawSnapshot';
import { RawGraphState } from './RawState';
import { RawStateSynchronizer } from './RawStateSynchonizer';
import { RawGraphUpdater } from './RawUpdater';

export class RawEngine implements IEngine {
    private readonly state: RawGraphState = new RawGraphState();
    private readonly updater: RawGraphUpdater = new RawGraphUpdater();
    private readonly synchronizer: RawStateSynchronizer =
        new RawStateSynchronizer(this.updater);
    private readonly rewinder: StateRewinder<RawSnapshot> = new StateRewinder();

    private extraRewindNodes: Set<number> = new Set();
    private extraSignalsHistory: Map<number, Map<number, NodeSignal>> =
        new Map();

    private saveSnapshots: boolean;

    public constructor() {
        this.saveSnapshots = EnableSnapshotsSetting.value;
        EnableSnapshotsSetting.onChange.add((newValue) => {
            this.saveSnapshots = newValue;
        });
    }

    public runTick(): void {
        if (this.saveSnapshots) {
            const curSignals = this.extraSignalsHistory.get(this.getTick());
            const signals = curSignals ?? new Map<number, NodeSignal>();
            for (const nodeIdx of this.extraRewindNodes) {
                const signal = this.getNodeSignal(nodeIdx);
                if (signal === NodeSignal.NONE) {
                    continue;
                }
                signals.set(nodeIdx, signal);
            }
            this.extraSignalsHistory.set(this.getTick(), signals);

            if (this.rewinder.canDoSnapshot(this.getTick())) {
                this.rewinder.saveSnapshot(this.state.makeSnapshot());

                const oldestTick = this.rewinder.getOldestSnapshotTick();
                for (const tick of this.extraSignalsHistory.keys()) {
                    if (tick < oldestTick) {
                        this.extraSignalsHistory.delete(tick);
                    }
                }
            }
        }
        this.updater.updateState(this.state);
    }

    public runManyTicks(ticksCount: number): void {
        for (let i = 0; i < ticksCount; i++) {
            this.runTick();
        }
    }

    private applyRecordedSignals(tick: number): void {
        const recordedSignals = this.extraSignalsHistory.get(tick);
        if (!recordedSignals) {
            return;
        }
        for (const nodeIdx of this.extraRewindNodes) {
            const nodeState = this.state.getNode(nodeIdx);
            if (nodeState) {
                nodeState.signal = NodeSignal.NONE;
                this.state.changedNodes.push(nodeState);
            }
        }
        for (const [nodeIdx, signal] of recordedSignals) {
            const nodeState = this.state.getNode(nodeIdx);
            if (nodeState) {
                nodeState.signal = signal;
                this.state.changedNodes.push(nodeState);
            }
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
            this.applyRecordedSignals(this.getTick());
            this.updater.updateState(this.state);
        }
        this.applyRecordedSignals(targetTick);

        const savedTicks = Array.from(this.extraSignalsHistory.keys());
        savedTicks.forEach((savedTick) => {
            if (savedTick > targetTick) {
                this.extraSignalsHistory.delete(savedTick);
            }
        });

        this.state.makeAllChunksDirty();
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

    public setExtraRewindNodes(nodeIndices: Set<number>): void {
        this.extraRewindNodes = nodeIndices;
    }

    public reset(): void {
        this.state.reset();
        this.rewinder.reset();
        this.extraSignalsHistory.clear();
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
        const astState = this.state.getNode(nodeIdx);
        astState.signal = state ? NodeSignal.ACTIVE : NodeSignal.NONE;
        this.updater.markNodeAsChanged(this.state, astState);
        this.state.changedNodes.push(astState);
        this.state.makeDirtyChunk(astState.chunkIdx);
    }

    public doArrowSignal(nodeIdx: number, state: boolean): void {
        const astState = this.state.getNode(nodeIdx);
        astState.signal = state ? NodeSignal.ACTIVE : NodeSignal.NONE;

        if (this.saveSnapshots) {
            const currentTick = this.getTick();
            let recordedSignals = this.extraSignalsHistory.get(currentTick);

            if (!recordedSignals) {
                recordedSignals = new Map<number, NodeSignal>();
                this.extraSignalsHistory.set(currentTick, recordedSignals);
            }

            const signal = this.getNodeSignal(nodeIdx);
            recordedSignals.set(nodeIdx, signal);
        }

        this.state.changedNodes.push(astState);
        this.state.makeDirtyChunk(astState.chunkIdx);
    }

    public clear(): void {
        this.state.clear();
    }
}
