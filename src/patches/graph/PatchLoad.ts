import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { load } from '@logic-arrows/utils/load';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

export const PatchLoad: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('load', (_module: typeof load) => {
        return function load(map: GameMap, buffer: number[]): void {
            if (buffer.length < 4) return;
            let index: number = 0;
            let version: number = buffer[index++];
            version |= buffer[index++] << 8;
            if (version !== 0) {
                throw new Error('Unsupported save version');
            }
            let chunksCount: number = buffer[index++];
            chunksCount |= buffer[index++] << 8;
            for (let i: number = 0; i < chunksCount; i++) {
                let chunkX: number = buffer[index++];
                chunkX |= (buffer[index++] & 0x7f) << 8;
                if ((buffer[index - 1] & 0x80) !== 0) chunkX = -chunkX;
                let chunkY: number = buffer[index++];
                chunkY |= (buffer[index++] & 0x7f) << 8;
                if ((buffer[index - 1] & 0x80) !== 0) chunkY = -chunkY;
                const arrowsTypesCount: number = buffer[index++] + 1;
                const chunk: Chunk = map.getOrCreateChunk(chunkX, chunkY);
                for (let j: number = 0; j < arrowsTypesCount; j++) {
                    const type: number = buffer[index++];
                    const typeCount: number = buffer[index++] + 1;
                    for (let k: number = 0; k < typeCount; k++) {
                        const position: number = buffer[index++];
                        const rotation: number = buffer[index++];
                        const arrow: Arrow = chunk.getArrow(
                            position & 0xf,
                            position >> 4,
                        );
                        arrow.type = type;
                        arrow.rotation = rotation & 0x3;
                        arrow.flipped = (rotation & 0x4) !== 0;
                        map.rawGraph.updateArrowType(
                            arrow,
                            chunk,
                            chunkX * CHUNK_SIZE + (position & 0xf),
                            chunkY * CHUNK_SIZE + (position >> 4),
                            0,
                            type,
                        );
                    }
                }
            }
        };
    });
};
