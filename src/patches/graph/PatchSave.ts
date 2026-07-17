import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { save } from '@logic-arrows/utils/save';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

export const PatchSave: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('save', (_module: typeof save) => {
        return function save(map: GameMap): number[] {
            const buffer: number[] = [];
            buffer.push(0, 0); // version
            buffer.push(map.chunks.size & 0xff, (map.chunks.size >> 8) & 0xff);
            map.chunks.forEach((chunk: Chunk) => {
                if (chunk.isEmpty()) return;
                const arrowsTypes: number[] = chunk.getArrowTypes();
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
                buffer.push(...chunkBytesX);
                buffer.push(...chunkBytesY);
                buffer.push(arrowsTypes.length - 1);
                arrowsTypes.forEach((type: number) => {
                    buffer.push(type);
                    buffer.push(0);
                    const typesCountIndex: number = buffer.length - 1;
                    let typeCount: number = 0;
                    for (let i: number = 0; i < CHUNK_SIZE; i++) {
                        for (let j: number = 0; j < CHUNK_SIZE; j++) {
                            const arrow: Arrow = chunk.getArrow(i, j);
                            if (arrow.type === type) {
                                const position: number = i | (j << 4);
                                const rotation: number =
                                    arrow.rotation |
                                    ((arrow.flipped ? 1 : 0) << 2);
                                buffer.push(position);
                                buffer.push(rotation);
                                typeCount++;
                            }
                        }
                    }
                    buffer[typesCountIndex] = typeCount - 1;
                });
            });
            return buffer;
        };
    });
};
