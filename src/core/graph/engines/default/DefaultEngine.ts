import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { ChunkUpdates } from '@logic-arrows/game-logic/chunk-updates';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import { ACTIVE_SIGNALS, ArrowSignal } from 'src/core/utils/ArrowSignal';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import type { GraphCycle } from '../../ast/CycleTypes';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { BaseEngine, type EngineTypes } from '../core/types/BaseEngine';
import { ChunkSnapshot, DefaultSnapshot } from './DefaultSnapshot';

interface DefaultEngineTypes extends EngineTypes {
    Snapshot: DefaultSnapshot;
}

export class DefaultEngine extends BaseEngine<DefaultEngineTypes> {
    public chunkUpdates: typeof ChunkUpdates;

    private tick: number = 0;

    private isBreakPoint: boolean = false;
    private breakPointNode: number = 0;
    private breakPoints: number[] = [];

    public constructor(
        public readonly graph: Graph,
        public readonly gameMap: GameMap,
    ) {
        super();
        this.chunkUpdates =
            window.graphdlc.patchLoader.getDefinition('ChunkUpdates').val;
    }

    protected runTickInternal(): boolean {
        if (this.useBreakPoints) {
            this.breakPoints.forEach((nodeIdx) => {
                const arrow = this.graph.getArrow(nodeIdx);
                if (arrow.lastSignal === 0 && arrow.signal !== 0) {
                    this.isBreakPoint = true;
                    this.breakPointNode = nodeIdx;
                }
            });
        }
        this.chunkUpdates.oldUpdate(this.gameMap);
        this.tick += 1;
        return this.isBreakPoint;
    }

    protected makeSnapshot(): DefaultSnapshot {
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

    protected loadSnapshot(snapshot: DefaultSnapshot): void {
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

    protected markAllChunksDirty(): void {
        for (const chunk of this.graph.getChunks()) {
            chunk.markRenderDirty();
        }
    }

    public setNodeSignalInternal(nodeIdx: number, signal: NodeSignal): void {
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

    public getTick(): number {
        return this.tick;
    }

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

    public getDirtyChunks(_markUndirty: boolean): ReadonlyArray<number> {
        return [];
    }

    public makeDirtyChunk(chunkIdx: number): void {
        this.graph.getChunkByIdx(chunkIdx).markRenderDirty();
    }

    public makeUndirtyChunk(chunkIdx: number): void {
        this.graph.getChunkByIdx(chunkIdx).renderDirty = false;
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        const arrow = this.graph.getArrow(nodeIdx);
        if (arrow.signal === ArrowSignal.BLUE) return NodeSignal.PENDING;
        if (arrow.signal === ArrowSignal.NONE) return NodeSignal.NONE;
        return NodeSignal.ACTIVE;
    }

    public reset(): void {
        this.chunkUpdates.oldClearSignals(this.gameMap);
        this.tick = 0;
    }

    public onCycleBuild(_cycle: GraphCycle): void {}

    public onCycleDismantle(_cycle: GraphCycle): void {}

    public updateNodeChange(_node: GraphNode, _oldLinks: GraphNode[]): void {
        removeWithSwap(this.breakPoints, _node.nodeIdx);
        if (_node.isBreakpoint) {
            this.breakPoints.push(_node.nodeIdx);
        }
    }

    public resetNodeSignal(node: GraphNode): void {
        const arrow = this.graph.getArrow(node.nodeIdx);
        arrow.lastSignal = ArrowSignal.NONE;
        arrow.signal = ArrowSignal.NONE;
    }

    public updateNodeState(node: GraphNode): void {
        removeWithSwap(this.breakPoints, node.nodeIdx);
        if (node.isBreakpoint) {
            this.breakPoints.push(node.nodeIdx);
        }
    }

    public updateChunk(_chunk: Chunk): void {}

    public clear(): void {
        this.tick = 0;
    }
}
