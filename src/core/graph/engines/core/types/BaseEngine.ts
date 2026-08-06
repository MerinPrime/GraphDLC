import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { GraphCycle } from 'src/core/graph/ast/CycleTypes';
import type { GraphNode } from 'src/core/graph/ast/GraphNode';
import type { NodeSignal } from '../NodeSignal';
import { StateRewinder } from '../StateRewinder';
import type { IEngine } from './IEngine';
import type { ISnapshot } from './ISnapshot';

export interface EngineTypes {
    Snapshot: ISnapshot;
}

export abstract class BaseEngine<T extends EngineTypes> implements IEngine {
    protected rewinder: StateRewinder<T['Snapshot']> = new StateRewinder();

    protected saveSnapshots: boolean = false;
    protected useBreakPoints: boolean = false;

    public abstract runTick(): boolean;
    public abstract runManyTicks(ticksCount: number): boolean;

    public abstract rewindToTick(targetTick: number): void;
    public abstract getTick(): number;
    public abstract getBreakpoint(doReset?: boolean): number | false;
    public abstract isChanged(): boolean;
    public abstract getDirtyChunks(markUndirty: boolean): ReadonlyArray<number>;
    public abstract makeDirtyChunk(chunkIdx: number): void;
    public abstract makeUndirtyChunk(chunkIdx: number): void;
    public abstract getNodeSignal(nodeIdx: number): NodeSignal;
    public abstract setExtraRewindNodes(nodeIndices: Set<number>): void;
    public abstract reset(): void;
    public abstract onCycleBuild(cycle: GraphCycle): void;
    public abstract onCycleDismantle(cycle: GraphCycle): void;
    public abstract updateNodeChange(
        node: GraphNode,
        oldLinks: GraphNode[],
    ): void;
    public abstract resetNodeSignal(node: GraphNode): void;
    public abstract updateNodeState(node: GraphNode): void;
    public abstract updateChunk(chunk: Chunk): void;
    public abstract doPressButton(nodeIdx: number, state: boolean): void;
    public abstract doArrowSignal(nodeIdx: number, state: boolean): void;

    public setBreakpointState(newState: boolean): void {
        this.useBreakPoints = newState;
    }

    public setSnapshotsState(newState: boolean): void {
        this.saveSnapshots = newState;
    }

    public abstract clear(): void;
}
