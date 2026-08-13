import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { GraphCycle } from 'src/core/graph/ast/cycle/CycleTypes';
import type { GraphNode } from 'src/core/graph/ast/GraphNode';
import { NodeSignal } from '../NodeSignal';
import { StateRewinder } from '../StateRewinder';
import type { IEngine } from './IEngine';
import type { ISnapshot } from './ISnapshot';

export interface EngineTypes {
    Snapshot: ISnapshot;
}

const MAX_REWIND_STEPS = 1000000;

export abstract class BaseEngine<T extends EngineTypes> implements IEngine {
    protected rewinder: StateRewinder<T['Snapshot']> = new StateRewinder();

    protected extraRewindNodes: Set<number> = new Set();
    protected extraSignalsHistory: Map<number, Map<number, NodeSignal>> =
        new Map();

    protected saveSnapshots: boolean = false;
    protected useBreakPoints: boolean = false;

    public runTick(): boolean {
        if (this.saveSnapshots) {
            const tick = this.getTick();

            const curSignals = this.extraSignalsHistory.get(this.getTick());
            const signals = curSignals ?? new Map<number, NodeSignal>();
            for (const nodeIdx of this.extraRewindNodes) {
                const signal = this.getNodeSignal(nodeIdx);
                if (signal === NodeSignal.NONE) {
                    continue;
                }
                signals.set(nodeIdx, signal);
            }
            this.extraSignalsHistory.set(tick, signals);

            if (this.rewinder.canDoSnapshot(tick)) {
                this.rewinder.saveSnapshot(this.makeSnapshot());

                const oldestTick = this.rewinder.getOldestSnapshotTick();
                for (const tick of this.extraSignalsHistory.keys()) {
                    if (tick < oldestTick) {
                        this.extraSignalsHistory.delete(tick);
                    }
                }
            }
        }

        return this.runTickInternal();
    }

    public runManyTicks(ticksCount: number): boolean {
        if (!this.saveSnapshots) {
            const breakPoint = this.runManyTicksInternal(ticksCount);
            return breakPoint;
        }
        for (let i = 0; i < ticksCount; i++) {
            const breakPoint = this.runTick();
            if (breakPoint) return true;
        }
        return false;
    }

    protected abstract runTickInternal(): boolean;

    protected runManyTicksInternal(ticksCount: number): boolean {
        for (let i = 0; i < ticksCount; i++) {
            const breakPoint = this.runTickInternal();
            if (breakPoint) return true;
        }
        return false;
    }

    public abstract getTick(): number;

    protected abstract makeSnapshot(): T['Snapshot'];
    protected abstract loadSnapshot(snapshot: T['Snapshot']): void;

    public rewindToTick(targetTick: number): void {
        const closestSnapshot = this.rewinder.findClosestSnapshot(targetTick);
        if (!closestSnapshot) {
            return;
        }

        const stepsToSimulate = targetTick - closestSnapshot.tick;
        if (stepsToSimulate > MAX_REWIND_STEPS) {
            this.rewinder.reset();
            return;
        }

        this.loadSnapshot(closestSnapshot);
        for (let i = 0; i < stepsToSimulate; i++) {
            this.applyRecordedSignals(this.getTick());
            this.runTickInternal();
        }
        this.applyRecordedSignals(this.getTick());

        const savedTicks = Array.from(this.extraSignalsHistory.keys());
        savedTicks.forEach((savedTick) => {
            if (savedTick > targetTick) {
                this.extraSignalsHistory.delete(savedTick);
            }
        });

        this.markAllChunksDirty();
    }

    private applyRecordedSignals(tick: number): void {
        const recordedSignals = this.extraSignalsHistory.get(tick);
        if (!recordedSignals) return;

        for (const nodeIdx of this.extraRewindNodes) {
            const signal = recordedSignals.get(nodeIdx) ?? NodeSignal.NONE;

            this.setNodeSignal(nodeIdx, signal);
        }
    }

    protected abstract markAllChunksDirty(): void;

    public setNodeSignal(nodeIdx: number, signal: NodeSignal): void {
        if (this.saveSnapshots) {
            const currentTick = this.getTick();
            let recordedSignals = this.extraSignalsHistory.get(currentTick);

            if (!recordedSignals) {
                recordedSignals = new Map<number, NodeSignal>();
                this.extraSignalsHistory.set(currentTick, recordedSignals);
            }

            recordedSignals.set(nodeIdx, signal);
        }
        this.setNodeSignalInternal(nodeIdx, signal);
    }

    public abstract setNodeSignalInternal(
        nodeIdx: number,
        signal: NodeSignal,
    ): void;

    public abstract getBreakpoint(doReset?: boolean): number | false;
    public abstract isChanged(): boolean;
    public abstract getDirtyChunks(markUndirty: boolean): ReadonlyArray<number>;
    public abstract makeDirtyChunk(chunkIdx: number): void;
    public abstract makeUndirtyChunk(chunkIdx: number): void;
    public abstract getNodeSignal(nodeIdx: number): NodeSignal;

    public setExtraRewindNodes(_nodeIndices: Set<number>): void {
        this.extraRewindNodes = _nodeIndices;
    }

    public abstract onCycleBuild(cycle: GraphCycle): void;
    public abstract onCycleDismantle(cycle: GraphCycle): void;
    public abstract updateNodeChange(
        node: GraphNode,
        oldLinks: GraphNode[],
    ): void;
    public abstract resetNodeSignal(node: GraphNode): void;
    public abstract updateNodeState(node: GraphNode): void;
    public abstract updateChunk(chunk: Chunk): void;

    public setBreakpointState(newState: boolean): void {
        this.useBreakPoints = newState;
    }

    public setSnapshotsState(newState: boolean): void {
        this.saveSnapshots = newState;
    }

    public abstract reset(): void;
    public abstract clear(): void;
}
