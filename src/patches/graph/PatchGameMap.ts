import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GraphDLC } from 'src/core/GraphDLC';
import { Graph } from 'src/core/graph/Graph';
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
            public rawGraph: Graph;

            public constructor() {
                super();
                this.rawGraph = new Graph(this);
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
                this.rawGraph.updateArrowType(
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
                this.rawGraph.updateArrowRotation(
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
                this.rawGraph.updateArrowFlipped(
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
                this.rawGraph.updateArrowType(
                    arrow,
                    chunk,
                    globalX,
                    globalY,
                    oldType,
                    newType,
                );
            }

            public clearChunkIfEmpty(_chunk: Chunk): void {
                // TIP: Graph stores all connections include empty arrows
            }

            public clear(): void {
                super.clear();
                this.rawGraph.clear();
            }
        };
    });
};
