import type { GraphCycle } from 'src/core/graph/ast/cycle/types';
import type { Graph } from 'src/core/graph/ast/Graph';
import type { GraphNode } from 'src/core/graph/ast/GraphNode';
import type { GraphPath } from 'src/core/graph/ast/path/types';
import type { Bounds } from 'src/core/utils/Bounds';
import type { NodeSignal } from '../NodeSignal';
import type { EngineCapabilities } from './EngineCapabilities';

export interface IEngine {
    readonly capabilities: EngineCapabilities;
    runTick(): boolean;
    runManyTicks(ticksCount: number): boolean;
    rewindToTick(targetTick: number): void;

    getTick(): number;
    getBreakpoint(doReset?: boolean): number | false;
    isChanged(): boolean;

    getDirtyChunks(
        markUndirty: boolean,
        bounds?: Bounds,
    ): ReadonlyArray<number>;
    makeDirtyChunk(chunkIdx: number): void;
    makeUndirtyChunk(chunkIdx: number): void;
    markCyclesDirtyBulk?(): void;
    getNodeSignal(nodeIdx: number): NodeSignal;
    fillNodeSignalsBulk?(nodeIndices: Uint32Array): Uint8Array;
    fillChunksSignalsBulk?(chunkIndices: Uint32Array | number[]): Uint8Array;
    registerChunk?(chunkIdx: number, x: number, y: number): void;

    reset(): void;

    addCycle(cycle: GraphCycle): void;
    removeCycle(cycle: GraphCycle): void;

    addPath(path: GraphPath): void;
    removePath(path: GraphPath): void;

    updateNodeState(graph: Graph, node: GraphNode): void;

    ensureNodeCapacity(nodesCount: number): void;
    ensureChunkCapacity(chunksCount: number): void;

    setBreakpointState(newState: boolean): void;
    setSnapshotsState(newState: boolean): void;

    clear(): void;
}
