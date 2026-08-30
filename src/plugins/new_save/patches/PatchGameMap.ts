import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GamePage } from '@logic-arrows/pages/game-page';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { ArrowType } from 'src/core/utils/ArrowType';
import type { IPatcher } from '../../Patcher';

interface PrivateGameMap {
    getOrCreateChunkByArrowCoordinates(x: number, y: number): Chunk;
}

export const PatchGameMap: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('GameMap', (_module: typeof GameMap) => {
        const GamePage = patchLoader.getInstance<GamePage>('GamePage');

        return class GameMap extends _module {
            public setArrowType(
                globalX: number,
                globalY: number,
                type: number,
                player?: boolean,
            ): void {
                super.setArrowType(globalX, globalY, type, player);
                if (this.isMain) GamePage.val?.updateIsMapChanged(true);
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
                if (arrow.type === ArrowType.EMPTY) return;
                if (arrow.rotation === rotation) return;
                super.setArrowRotation(globalX, globalY, rotation, player);
                if (this.isMain) GamePage.val?.updateIsMapChanged(true);
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
                if (arrow.type === ArrowType.EMPTY) return;
                if (arrow.flipped === flipped) return;
                super.setArrowFlipped(globalX, globalY, flipped, player);
                if (this.isMain) GamePage.val?.updateIsMapChanged(true);
            }

            public removeArrow(
                globalX: number,
                globalY: number,
                player?: boolean,
            ): void {
                const chunk = (
                    this as any as PrivateGameMap
                ).getOrCreateChunkByArrowCoordinates(globalX, globalY);
                const arrow = chunk.getArrow(
                    globalX - chunk.x * CHUNK_SIZE,
                    globalY - chunk.y * CHUNK_SIZE,
                );
                if (arrow.type === ArrowType.EMPTY) return;
                super.removeArrow(globalX, globalY, player);
                if (this.isMain) GamePage.val?.updateIsMapChanged(true);
            }

            public updateArrowState(
                arrow: Arrow,
                chunk: Chunk,
                chunkX: number,
                chunkY: number,
            ) {
                if (this.isMain) {
                    this.graph.updateArrowState(arrow, chunk, chunkX, chunkY);
                    GamePage.val?.updateIsMapChanged(true);
                }
            }

            public clear(): void {
                super.clear();
                if (this.isMain) GamePage.val?.updateIsMapChanged(true);
            }
        };
    });
};
