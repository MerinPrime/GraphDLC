import type { ChunkUpdates } from '@logic-arrows/game-logic/chunk-updates';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import { ACTIVE_SIGNALS, ArrowSignal } from 'src/core/utils/ArrowSignal';
import type { Graph } from '../../ast/Graph';
import { NodeSignal } from '../core/NodeSignal';
import type { IState } from '../core/types/IState';
import { ChunkSnapshot, DefaultSnapshot } from './DefaultSnapshot';

export class DefaultState implements IState<DefaultSnapshot> {
    public tick: number = 0;
    public isBreakPoint: boolean = false;
    public breakPointNode: number = 0;

    public constructor(
        private readonly graph: Graph,
        private readonly gameMap: GameMap,
        private readonly chunkUpdates: typeof ChunkUpdates,
    ) {}

    public reset(): void {
        this.chunkUpdates.oldClearSignals(this.gameMap);
        this.tick = 0;
    }

    public clear(): void {
        this.tick = 0;
    }

    public makeSnapshot(): DefaultSnapshot {
        const snapshot = new DefaultSnapshot();
        snapshot.tick = this.getTick();
        this.gameMap.chunks.forEach((chunk) => {
            const chunkSnapshot = new ChunkSnapshot();
            chunkSnapshot.x = chunk.x;
            chunkSnapshot.y = chunk.y;
            chunkSnapshot.signals = chunk
                .getArrows()
                .map((arrow) => arrow.signal);
            snapshot.chunks.push(chunkSnapshot);
        });
        return snapshot;
    }

    public loadSnapshot(snapshot: DefaultSnapshot): void {
        this.tick = snapshot.tick;
        snapshot.chunks.forEach((chunkSnapshot) => {
            const chunk = this.gameMap.getChunk(
                chunkSnapshot.x,
                chunkSnapshot.y,
            );
            chunk?.getArrows().forEach((arrow, idx) => {
                arrow.signal = chunkSnapshot.signals[idx];
            });
        });
        for (const chunk of this.graph.getChunks()) {
            chunk.setUpdated();
        }
    }

    public getTick(): number {
        return this.tick;
    }

    public markAllChunksDirty(): void {
        for (const chunk of this.graph.getChunks()) {
            chunk.markRenderDirty();
        }
    }

    public setNodeSignal(nodeIdx: number, signal: NodeSignal): void {
        const node = this.graph.getNode(nodeIdx);
        const chunk = this.graph.getChunkByIdx(node.chunkIdx);
        const arrow = this.graph.getArrow(nodeIdx);
        if (signal === NodeSignal.NONE) arrow.signal = ArrowSignal.NONE;
        else if (signal === NodeSignal.PENDING) arrow.signal = ArrowSignal.BLUE;
        else if (signal === NodeSignal.ACTIVE)
            arrow.signal = ACTIVE_SIGNALS[arrow.type];
        chunk.setUpdated();
        chunk.markRenderDirty();
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        const arrow = this.graph.getArrow(nodeIdx);
        if (arrow.signal === ACTIVE_SIGNALS[arrow.type])
            return NodeSignal.ACTIVE;
        if (arrow.signal === ArrowSignal.BLUE) return NodeSignal.PENDING;
        return NodeSignal.NONE;
    }

    public ensureNodeCapacity(_nodesCount: number): void {}

    public ensureChunkCapacity(_chunksCount: number): void {}

    public getBreakpoint(doReset: boolean = false): number | false {
        if (this.isBreakPoint) {
            this.isBreakPoint = !doReset;
            return this.breakPointNode;
        }
        return false;
    }

    public isChanged(): boolean {
        return true;
    }

    public getDirtyChunks(_markUndirty: boolean): number[] {
        return [];
    }

    public makeDirtyChunk(chunkIdx: number): void {
        this.graph.getChunkByIdx(chunkIdx).markRenderDirty();
    }

    public makeUndirtyChunk(chunkIdx: number): void {
        this.graph.getChunkByIdx(chunkIdx).renderDirty = false;
    }
}
