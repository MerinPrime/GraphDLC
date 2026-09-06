import type { NodeSignal } from '../NodeSignal';
import type { ISnapshot } from './ISnapshot';

export interface IState<TSnapshot extends ISnapshot> {
    reset(): void;
    clear(): void;

    makeSnapshot(): TSnapshot;
    loadSnapshot(snapshot: TSnapshot): void;
    getTick(): number;

    setNodeSignal(nodeIdx: number, signal: NodeSignal): void;
    getNodeSignal(nodeIdx: number): NodeSignal;

    ensureNodeCapacity(nodesCount: number): void;
    ensureChunkCapacity(chunksCount: number): void;

    getBreakpoint(doReset?: boolean): number | false;
    isChanged(): boolean;

    getDirtyChunks(markUndirty: boolean): [...chunkIdx: number[]];
    makeDirtyChunk(chunkIdx: number): void;
    makeUndirtyChunk(chunkIdx: number): void;
    markAllChunksDirty(): void;
}
