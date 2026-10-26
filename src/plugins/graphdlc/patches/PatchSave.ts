import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { save } from '@logic-arrows/utils/save';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

interface ChunkSaveData {
    chunk: Chunk;
    arrowTypes: number[];
}

export const PatchSave: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('save', (_module: typeof save) => {
        return function save(map: GameMap): number[] {
            const buffer: number[] = [];
            buffer.push(0, 0);

            const chunksToSave: ChunkSaveData[] = [];
            for (const chunk of map.chunks.values()) {
                const arrowTypes = chunk.getArrowTypes();
                if (arrowTypes.length > 0) {
                    chunksToSave.push({ chunk, arrowTypes });
                }
            }

            chunksToSave.sort(
                (a, b) => a.chunk.x - b.chunk.x || b.chunk.y - a.chunk.y,
            );

            buffer.push(
                chunksToSave.length & 0xff,
                (chunksToSave.length >> 8) & 0xff,
            );

            for (const { chunk, arrowTypes } of chunksToSave) {
                const chunkBytesX: number[] = [
                    Math.abs(chunk.x) & 0xff,
                    (Math.abs(chunk.x) >> 8) & 0xff,
                ];
                const chunkBytesY: number[] = [
                    Math.abs(chunk.y) & 0xff,
                    (Math.abs(chunk.y) >> 8) & 0xff,
                ];

                if (chunk.x < 0) chunkBytesX[1] |= 0x80;
                else chunkBytesX[1] &= 0x7f;

                if (chunk.y < 0) chunkBytesY[1] |= 0x80;
                else chunkBytesY[1] &= 0x7f;

                buffer.push(
                    chunkBytesX[0],
                    chunkBytesX[1],
                    chunkBytesY[0],
                    chunkBytesY[1],
                );
                buffer.push(arrowTypes.length - 1);

                for (let t = 0; t < arrowTypes.length; t++) {
                    const type = arrowTypes[t];
                    buffer.push(type);
                    buffer.push(0);
                    const typesCountIndex = buffer.length - 1;

                    let typeCount = 0;
                    for (let i = 0; i < CHUNK_SIZE; i++) {
                        for (let j = 0; j < CHUNK_SIZE; j++) {
                            const arrow: Arrow = chunk.getArrow(i, j);
                            if (arrow.type === type) {
                                const position = i | (j << 4);
                                const rotation =
                                    arrow.rotation |
                                    ((arrow.flipped ? 1 : 0) << 2);
                                buffer.push(position, rotation);
                                typeCount++;
                            }
                        }
                    }

                    buffer[typesCountIndex] = typeCount - 1;
                }
            }

            return buffer;
        };
    });
};
