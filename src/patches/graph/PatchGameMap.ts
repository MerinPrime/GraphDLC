import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GraphDLC } from 'src/core/GraphDLC';
import { Graph } from 'src/core/graph/ast/Graph';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

interface PrivateGameMap {
    getOrCreateChunkByArrowCoordinates(x: number, y: number): Chunk;
}

export const PatchGameMap: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('GameMap', (_module: typeof GameMap) => {
        return class GameMap extends _module {
            public graph: Graph;
            public isMain: boolean = false;

            public constructor(isMain: boolean = false) {
                super();
                this.graph = new Graph(this);
                this.isMain = isMain;
            }

            public setArrowType(
                globalX: number,
                globalY: number,
                type: number,
                player?: boolean,
            ): void {
                const chunk = (
                    this as any as PrivateGameMap
                ).getOrCreateChunkByArrowCoordinates(globalX, globalY);
                const arrow = chunk.getArrow(
                    globalX - chunk.x * CHUNK_SIZE,
                    globalY - chunk.y * CHUNK_SIZE,
                );
                const oldType = arrow.type;
                super.setArrowType(globalX, globalY, type, player);
                if (oldType === arrow.type) return;
                const newType = arrow.type;
                if (this.isMain)
                    this.graph.updateArrowType(
                        arrow,
                        chunk,
                        globalX,
                        globalY,
                        oldType,
                        newType,
                    );
            }

            public setArrowRotation(
                globalX: number,
                globalY: number,
                rotation: number,
                player?: boolean,
            ): void {
                const chunk = (
                    this as any as PrivateGameMap
                ).getOrCreateChunkByArrowCoordinates(globalX, globalY);
                const arrow = chunk.getArrow(
                    globalX - chunk.x * CHUNK_SIZE,
                    globalY - chunk.y * CHUNK_SIZE,
                );
                const oldRotation = arrow.rotation;
                super.setArrowRotation(globalX, globalY, rotation, player);
                if (oldRotation === arrow.rotation) return;
                const newRotation = arrow.rotation;
                if (this.isMain)
                    this.graph.updateArrowRotation(
                        arrow,
                        chunk,
                        globalX,
                        globalY,
                        newRotation,
                    );
            }

            public setArrowFlipped(
                globalX: number,
                globalY: number,
                flipped: boolean,
                player?: boolean,
            ): void {
                const chunk = (
                    this as any as PrivateGameMap
                ).getOrCreateChunkByArrowCoordinates(globalX, globalY);
                const arrow = chunk.getArrow(
                    globalX - chunk.x * CHUNK_SIZE,
                    globalY - chunk.y * CHUNK_SIZE,
                );
                const oldFlipped = arrow.flipped;
                super.setArrowFlipped(globalX, globalY, flipped, player);
                if (oldFlipped === arrow.flipped) return;
                const newFlipped = arrow.flipped;
                if (this.isMain)
                    this.graph.updateArrowFlipped(
                        arrow,
                        chunk,
                        globalX,
                        globalY,
                        newFlipped,
                    );
            }

            public removeArrow(
                globalX: number,
                globalY: number,
                player?: boolean,
            ): void {
                const chunk = this.getChunkByArrowCoordinates(globalX, globalY);
                if (!chunk) return;
                const arrow = chunk.getArrow(
                    globalX - chunk.x * CHUNK_SIZE,
                    globalY - chunk.y * CHUNK_SIZE,
                );
                if (!arrow) return;
                const oldType = arrow.type;
                super.removeArrow(globalX, globalY, player);
                if (oldType === arrow.type) return;
                const newType = arrow.type;
                if (this.isMain)
                    this.graph.updateArrowType(
                        arrow,
                        chunk,
                        globalX,
                        globalY,
                        oldType,
                        newType,
                    );
            }

            public updateArrowState(
                arrow: Arrow,
                chunk: Chunk,
                chunkX: number,
                chunkY: number,
            ) {
                if (this.isMain)
                    this.graph.updateArrowState(arrow, chunk, chunkX, chunkY);
            }

            public clearChunkIfEmpty(chunk: Chunk): void {
                // TIP: Graph stores all connections include empty arrows
                if (!this.isMain) super.clearChunkIfEmpty(chunk);
            }

            public clear(): void {
                this.chunks.forEach((chunk: Chunk) => {
                    chunk.getArrows().forEach((arrow) => {
                        arrow.astIndex = null;
                    });
                });
                super.clear();
                if (this.isMain) this.graph.clear();
            }
        };
    });
};
