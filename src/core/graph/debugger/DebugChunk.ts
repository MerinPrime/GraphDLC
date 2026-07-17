import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { Bounds } from 'src/core/utils/Bounds';
import type { DebugColor, RenderDebugColor } from './types';

export class DebugChunk {
    public readonly chunkIdx: number;
    public readonly globalX: number;
    public readonly globalY: number;

    private colorCache: Float32Array = new Float32Array(
        CHUNK_SIZE * CHUNK_SIZE * 4,
    );

    public constructor(chunkIdx: number, x: number, y: number) {
        this.chunkIdx = chunkIdx;
        this.globalX = x * CHUNK_SIZE;
        this.globalY = y * CHUNK_SIZE;
    }

    public inBounds(bounds: Bounds) {
        return bounds.InBounds(this.globalX, this.globalY);
    }

    public setColor(x: number, y: number, [r, g, b, a]: DebugColor) {
        const offset = ((y << 4) | x) << 2;

        this.colorCache[offset] = r;
        this.colorCache[offset + 1] = g;
        this.colorCache[offset + 2] = b;
        this.colorCache[offset + 3] = a;
    }

    public renderChunk(renderColor: RenderDebugColor) {
        for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
            const offset = i << 2;
            const a = this.colorCache[offset + 3];

            if (a > 0) {
                const localX = i & 15;
                const localY = i >> 4;

                const color: DebugColor = [
                    this.colorCache[offset],
                    this.colorCache[offset + 1],
                    this.colorCache[offset + 2],
                    a,
                ];

                renderColor(
                    this.globalX + localX,
                    this.globalY + localY,
                    color,
                );
            }
        }
    }
}
