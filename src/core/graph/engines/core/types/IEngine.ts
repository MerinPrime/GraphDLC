import type { GraphCycle } from 'src/core/graph/ast/cycle/CycleTypes';
import type { Graph } from 'src/core/graph/ast/Graph';
import type { GraphNode } from 'src/core/graph/ast/GraphNode';
import type { NodeSignal } from '../NodeSignal';

export interface IEngine {
    runTick(): boolean;
    runManyTicks(ticksCount: number): boolean;
    rewindToTick(targetTick: number): void;

    getTick(): number;
    getBreakpoint(doReset?: boolean): number | false;
    isChanged(): boolean;

    getDirtyChunks(markUndirty: boolean): ReadonlyArray<number>;
    makeDirtyChunk(chunkIdx: number): void;
    makeUndirtyChunk(chunkIdx: number): void;
    getNodeSignal(nodeIdx: number): NodeSignal;

    setExtraRewindNodes(nodeIndices: Set<number>): void;

    reset(): void;

    addCycle(cycle: GraphCycle): void;
    removeCycle(cycle: GraphCycle): void;

    updateNodeState(graph: Graph, node: GraphNode): void;

    ensureNodeCapacity(nodesCount: number): void;
    ensureChunkCapacity(chunksCount: number): void;

    setBreakpointState(newState: boolean): void;
    setSnapshotsState(newState: boolean): void;

    clear(): void;
}
