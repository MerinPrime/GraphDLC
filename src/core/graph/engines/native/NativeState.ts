import type { NodeSignal } from '../core/NodeSignal';
import type { IState } from '../core/types/IState';
import type { NativeSnapshot } from './NativeSnapshot';
import type { RustWrapper } from './RustWrapper';

export class NativeState implements IState<NativeSnapshot> {
    public constructor(private readonly wrapper: RustWrapper) {}

    public reset(): void {
        this.wrapper.reset();
    }

    public clear(): void {
        this.wrapper.clear();
    }

    public makeSnapshot(): NativeSnapshot {
        return this.wrapper.makeSnapshot();
    }

    public loadSnapshot(snapshot: NativeSnapshot): void {
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

    public getDirtyChunks(markUndirty: boolean): number[] {
        return this.wrapper.getDirtyChunks(markUndirty);
    }

    public markAllChunksDirty(): void {
        this.wrapper.markAllChunksDirty();
    }
}
