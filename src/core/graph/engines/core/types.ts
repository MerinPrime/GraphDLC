import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { GraphCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import type { NodeSignal } from './NodeSignal';

export interface ISnapshot {
    tick: number;
}

export interface IEngine {
    runTick(): boolean;
    runManyTicks(ticksCount: number): boolean;
    rewindToTick(targetTick: number): void;

    getTick(): number;
    getBreakpoint(doReset?: boolean): number | false;
    isChanged(): boolean;

    getDirtyChunks(markUndirty: boolean): [...chunkIdx: number[]];
    makeDirtyChunk(chunkIdx: number): void;
    makeUndirtyChunk(chunkIdx: number): void;
    getNodeSignal(nodeIdx: number): NodeSignal;

    setExtraRewindNodes(nodeIndices: Set<number>): void;

    reset(): void;

    onCycleBuild(cycle: GraphCycle): void;
    onCycleDismantle(cycle: GraphCycle): void;

    updateNodeChange(node: GraphNode, oldLinks: GraphNode[]): void;

    resetNodeSignal(node: GraphNode): void;
    updateNodeState(node: GraphNode): void;
    updateChunk(chunk: Chunk): void;

    doPressButton(nodeIdx: number, state: boolean): void;
    doArrowSignal(nodeIdx: number, state: boolean): void;

    setBreakpointState(newState: boolean): void;
    setSnapshotsState(newState: boolean): void;

    clear(): void;
}
