import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { GraphCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { StateRewinder } from '../core/StateRewinder';
import type { IEngine } from '../core/types';
import { SoALayout } from './SoALayout';
import type { SoASnapshot } from './SoASnapshot';
import { SoAGraphState } from './SoAState';
import { SoAStateSynchronizer } from './SoAStateSynchronizer';
import { SoAGraphUpdater } from './SoAUpdater';

export class SoAEngine implements IEngine {
    private readonly state: SoAGraphState = new SoAGraphState();
    private readonly updater: SoAGraphUpdater = new SoAGraphUpdater();
    private readonly synchronizer: SoAStateSynchronizer =
        new SoAStateSynchronizer(this.updater);
    private readonly rewinder: StateRewinder<SoASnapshot> = new StateRewinder();

    private extraRewindNodes: Set<number> = new Set();
    private extraSignalsHistory: Map<number, Map<number, NodeSignal>> =
        new Map();

    private saveSnapshots: boolean = false;

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
            const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
            this.state.nodeData[nodeOffset + SoALayout.Node.SIGNAL] =
                NodeSignal.NONE;
            this.state.changedNodes.add(nodeIdx);
        }
        for (const [nodeIdx, signal] of recordedSignals) {
            const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
            this.state.nodeData[nodeOffset + SoALayout.Node.SIGNAL] = signal;
            this.state.changedNodes.add(nodeIdx);
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

    public resetBreakpoint(): number | false {
        if (this.state.breakPoint) {
            this.state.breakPoint = false;
            return this.state.breakPointNode;
        }
        return false;
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

    public doArrowSignal(nodeIdx: number, state: boolean): void {
        const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
        const extraNodeOffset = nodeIdx * SoALayout.Extra8Node.STRIDE;
        const chunkIdx =
            this.state.extra32NodeData[
                extraNodeOffset + SoALayout.Extra32Node.CHUNK_IDX
            ];

        this.state.nodeData[nodeOffset + SoALayout.Node.SIGNAL] = state
            ? NodeSignal.ACTIVE
            : NodeSignal.NONE;

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

        this.state.changedNodes.add(nodeIdx);
        this.state.makeDirtyChunk(chunkIdx);
    }

    public setBreakpointState(_: boolean): void {}

    public setSnapshotsState(newState: boolean): void {
        this.saveSnapshots = newState;
    }

    public clear(): void {
        this.state.clear();
    }
}
