import type { ISnapshot } from '../core/types/ISnapshot';

export class ChunkSnapshot {
    public x: number = 0;
    public y: number = 0;
    public signals: number[] = [];
}

export class DefaultSnapshot implements ISnapshot {
    public tick: number = 0;
    public chunks: ChunkSnapshot[] = [];
}
