import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { GraphCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import type { NodeSignal } from './NodeSignal';

export interface ISnapshot {
    tick: number;
}

export interface IEngine {
    runTick(): void;
    runManyTicks(ticksCount: number): void;
    rewindToTick(targetTick: number): void;

    getTick(): number;
    resetBreakpoint(): boolean;
    isChanged(): boolean;

    getDirtyChunks(markUndirty: boolean): [...chunkIdx: number[]];
    makeDirtyChunk(chunkIdx: number): void;
    makeUndirtyChunk(chunkIdx: number): void;
    getNodeSignal(nodeIdx: number): NodeSignal;

    reset(): void;

    onCycleBuild(cycle: GraphCycle): void;
    onCycleDismantle(cycle: GraphCycle): void;

    updateNodeChange(
        node: GraphNode,
        oldNextFull: GraphNode[],
        next: GraphNode[],
    ): void;

    updateNodeState(node: GraphNode, resetSignal?: boolean): void;
    updateChunk(chunk: Chunk): void;

    doPressButton(astIdx: number, state: boolean): void;

    clear(): void;
}
