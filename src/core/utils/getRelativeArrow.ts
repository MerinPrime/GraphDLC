import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import { getRelativePosition } from './getRelativePosition';

export interface RelativeArrow {
    arrow?: Arrow;
    x: number;
    y: number;
    chunk?: Chunk;
}

export function getRelativeArrow(
    chunk: Chunk,
    localX: number,
    localY: number,
    rotation: number,
    flipped: boolean,
    forward: number = -1,
    sideways: number = 0,
): RelativeArrow {
    const { x: targetX, y: targetY } = getRelativePosition(
        localX,
        localY,
        rotation,
        flipped,
        forward,
        sideways,
    );

    let targetChunk = chunk;
    const dx = Math.floor(targetX / CHUNK_SIZE);
    const dy = Math.floor(targetY / CHUNK_SIZE);

    let chunkTargetX = targetX;
    let chunkTargetY = targetY;

    if (dx !== 0 || dy !== 0) {
        const chunkIndex = (dy + 1) * 3 + (dx + 1);
        const adjacentMap = [7, 0, 1, 6, -1, 2, 5, 4, 3];
        const adjacentIndex = adjacentMap[chunkIndex];

        if (adjacentIndex === -1 || !chunk.adjacentChunks[adjacentIndex])
            return {
                x: targetX,
                y: targetY,
            };
        targetChunk = chunk.adjacentChunks[adjacentIndex]!;
        chunkTargetX %= CHUNK_SIZE;
        chunkTargetY %= CHUNK_SIZE;
        if (chunkTargetX < 0) chunkTargetX += CHUNK_SIZE;
        if (chunkTargetY < 0) chunkTargetY += CHUNK_SIZE;
    }

    if (!targetChunk)
        return {
            x: targetX,
            y: targetY,
        };

    return {
        arrow: targetChunk.getArrow(chunkTargetX, chunkTargetY),
        x: targetX,
        y: targetY,
        chunk: targetChunk,
    };
}
