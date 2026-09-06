import type { GraphCycle } from 'src/core/graph/ast/cycle/CycleTypes';
import type { Graph } from 'src/core/graph/ast/Graph';
import type { GraphNode } from 'src/core/graph/ast/GraphNode';
import { NodeSignal } from '../NodeSignal';
import { StateRewinder } from '../StateRewinder';
import type { IEngine } from './IEngine';
import type { ISnapshot } from './ISnapshot';
import type { IState } from './IState';

export interface EngineTypes {
    Snapshot: ISnapshot;
    State: IState<this['Snapshot']>;
}

const MAX_REWIND_STEPS = 1000000;

export abstract class BaseEngine<T extends EngineTypes> implements IEngine {
    protected readonly rewinder: StateRewinder<T['Snapshot']> =
        new StateRewinder();
    protected abstract readonly state: T['State'];

    protected extraRewindNodes: Set<number> = new Set();
    protected readonly extraSignalsHistory: Map<
        number,
        Map<number, NodeSignal>
    > = new Map();

    protected saveSnapshots: boolean = false;
    protected useBreakPoints: boolean = false;

    public reset(): void {
        this.state.reset();
        this.rewinder.reset();
        this.extraSignalsHistory.clear();
    }

    public clear(): void {
        this.state.clear();
    }

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

    protected makeSnapshot(): T['Snapshot'] {
        return this.state.makeSnapshot();
    }

    protected loadSnapshot(snapshot: T['Snapshot']): void {
        this.state.loadSnapshot(snapshot);
    }

    public getTick(): number {
        return this.state.getTick();
    }

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

    protected markAllChunksDirty(): void {
        this.state.markAllChunksDirty();
    }

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
        this.state.setNodeSignal(nodeIdx, signal);
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        return this.state.getNodeSignal(nodeIdx);
    }

    public getBreakpoint(doReset?: boolean): number | false {
        return this.state.getBreakpoint(doReset);
    }

    public isChanged(): boolean {
        return this.state.isChanged();
    }

    public getDirtyChunks(markUndirty: boolean): ReadonlyArray<number> {
        return this.state.getDirtyChunks(markUndirty);
    }

    public makeDirtyChunk(chunkIdx: number): void {
        this.state.makeDirtyChunk(chunkIdx);
    }

    public makeUndirtyChunk(chunkIdx: number): void {
        this.state.makeUndirtyChunk(chunkIdx);
    }

    public setExtraRewindNodes(_nodeIndices: Set<number>): void {
        this.extraRewindNodes = _nodeIndices;
    }

    public abstract addCycle(cycle: GraphCycle): void;
    public abstract removeCycle(cycle: GraphCycle): void;
    public abstract updateNodeState(graph: Graph, node: GraphNode): void;

    public ensureNodeCapacity(nodesCount: number): void {
        this.state.ensureNodeCapacity(nodesCount);
    }

    public ensureChunkCapacity(chunksCount: number): void {
        this.state.ensureChunkCapacity(chunksCount);
    }

    public setBreakpointState(newState: boolean): void {
        this.useBreakPoints = newState;
    }

    public setSnapshotsState(newState: boolean): void {
        this.saveSnapshots = newState;
    }
}
