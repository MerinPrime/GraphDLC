export type AreaBounds = [number, number, number, number];

export interface RenderOptions {
    cellSize?: number;
    maxTextureDim?: number;
    minCellSize?: number;
    qualityScale?: number;
}

export interface GifOptions extends RenderOptions {
    tickInterval: number;
    totalFrames: number;
    fps: number;
}
