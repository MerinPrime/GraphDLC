import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GraphCycle } from 'src/core/graph/ast/cycle/types';
import type { Graph } from 'src/core/graph/ast/Graph';
import type { GraphNode } from 'src/core/graph/ast/GraphNode';
import type { GraphPath } from 'src/core/graph/ast/path/types';
import type { Bounds } from 'src/core/utils/Bounds';
import { StaticSeedSetting } from 'src/plugins/graphdlc/settings/tools/StaticSeedSetting';
import type { NodeSignal } from '../NodeSignal';
import { StateRewinder } from '../StateRewinder';
import type { EngineCapabilities } from './EngineCapabilities';
import type { IEngine } from './IEngine';
import type { ISnapshot } from './ISnapshot';
import type { IState } from './IState';

export interface EngineTypes {
    Snapshot: ISnapshot;
    State: IState<this['Snapshot']>;
}

const MAX_REWIND_STEPS = 1000000;

export abstract class BaseEngine<T extends EngineTypes> implements IEngine {
    public readonly capabilities: EngineCapabilities = {
        canWriteAndClear: false,
        bulkRender: false,
        supportCycles: false,
    };

    protected readonly rewinder: StateRewinder<T['Snapshot']> =
        new StateRewinder();
    protected abstract readonly state: T['State'];

    protected readonly extraSignalsHistory: Map<
        number,
        Map<number, NodeSignal>
    > = new Map();

    protected saveSnapshots: boolean = false;
    protected useBreakPoints: boolean = false;

    public getSeed(): number {
        if (StaticSeedSetting.value !== 0) return StaticSeedSetting.value;
        return crypto.getRandomValues(new Uint32Array(1))[0];
    }

    public reset(): void {
        this.state.reset();
        this.rewinder.reset();
        this.extraSignalsHistory.clear();
        this.state.setSeed(this.getSeed());
    }

    public clear(): void {
        this.state.clear();
        this.state.setSeed(this.getSeed());
    }

    public runTick(): boolean {
        if (this.saveSnapshots) {
            const tick = this.getTick();

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

        for (const [nodeIdx, signal] of recordedSignals.entries()) {
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

    public getDirtyChunks(
        markUndirty: boolean,
        bounds?: Bounds,
    ): ReadonlyArray<number> {
        if (bounds) {
            const minChunkX = Math.floor(bounds.minX / CHUNK_SIZE);
            const minChunkY = Math.floor(bounds.minY / CHUNK_SIZE);
            const maxChunkX = Math.floor(bounds.maxX / CHUNK_SIZE);
            const maxChunkY = Math.floor(bounds.maxY / CHUNK_SIZE);

            const state = this.state as any;
            if (typeof state.getDirtyChunksInViewport === 'function') {
                return state.getDirtyChunksInViewport(
                    markUndirty,
                    minChunkX,
                    minChunkY,
                    maxChunkX,
                    maxChunkY,
                );
            }
        }
        return this.state.getDirtyChunks(markUndirty);
    }

    public registerChunk(chunkIdx: number, x: number, y: number): void {
        const state = this.state as any;
        if (typeof state.registerChunk === 'function') {
            state.registerChunk(chunkIdx, x, y);
        }
    }

    public makeDirtyChunk(chunkIdx: number): void {
        this.state.makeDirtyChunk(chunkIdx);
    }

    public makeUndirtyChunk(chunkIdx: number): void {
        this.state.makeUndirtyChunk(chunkIdx);
    }

    public fillNodeSignalsBulk?(nodeIndices: Uint32Array): Uint8Array;
    public fillChunksSignalsBulk?(
        chunkIndices: Uint32Array | number[],
    ): Uint8Array;

    public abstract addCycle(cycle: GraphCycle): void;
    public abstract removeCycle(cycle: GraphCycle): void;
    public addPath?(path: GraphPath): void;
    public removePath?(path: GraphPath): void;
    public abstract updateNodeState(graph: Graph, node: GraphNode): void;
    public abstract setNodeBreakpoint(
        nodeIdx: number,
        isBreakpoint: boolean,
    ): void;

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
