import type { NodeSignal } from '../core/NodeSignal';
import type { IState } from '../core/types/IState';
import type { NativeExpSnapshot } from './NativeExpSnapshot';
import type { RustExpWrapper } from './RustExpWrapper';

export class NativeExpState implements IState<NativeExpSnapshot> {
    public constructor(private readonly wrapper: RustExpWrapper) {}

    public reset(): void {
        this.wrapper.reset();
    }

    public clear(): void {
        this.wrapper.clear();
    }

    public setSeed(seed: number): void {
        this.wrapper.setSeed(seed);
    }

    public makeSnapshot(): NativeExpSnapshot {
        return this.wrapper.makeSnapshot();
    }

    public loadSnapshot(snapshot: NativeExpSnapshot): void {
        this.wrapper.loadSnapshot(snapshot);
    }

    public getTick(): number {
        return this.wrapper.getTick();
    }

    public setNodeSignal(nodeIdx: number, signal: NodeSignal): void {
        this.wrapper.setNodeSignal(nodeIdx, signal);
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        return this.wrapper.getNodeSignal(nodeIdx) as NodeSignal;
    }

    public ensureNodeCapacity(nodesCount: number): void {
        this.wrapper.ensureNodeCapacity(nodesCount);
    }

    public ensureChunkCapacity(chunksCount: number): void {
        this.wrapper.ensureChunkCapacity(chunksCount);
    }

    public getBreakpoint(doReset: boolean = false): number | false {
        return this.wrapper.getBreakpoint(doReset);
    }

    public isChanged(): boolean {
        return this.wrapper.isChanged();
    }

    public makeDirtyChunk(chunkIdx: number): void {
        this.wrapper.makeDirtyChunk(chunkIdx);
    }

    public makeUndirtyChunk(chunkIdx: number): void {
        this.wrapper.makeUndirtyChunk(chunkIdx);
    }

    public registerChunk(chunkIdx: number, x: number, y: number): void {
        this.wrapper.registerChunk(chunkIdx, x, y);
    }

    public getDirtyChunks(markUndirty: boolean): number[] {
        return this.wrapper.getDirtyChunks(markUndirty);
    }

    public getDirtyChunksInViewport(
        markUndirty: boolean,
        minChunkX: number,
        minChunkY: number,
        maxChunkX: number,
        maxChunkY: number,
    ): number[] {
        return this.wrapper.getDirtyChunksInViewport(
            markUndirty,
            minChunkX,
            minChunkY,
            maxChunkX,
            maxChunkY,
        );
    }

    public markAllChunksDirty(): void {
        this.wrapper.markAllChunksDirty();
    }
}
