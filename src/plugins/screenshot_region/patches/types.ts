export type AreaBounds = [number, number, number, number];

export interface RenderOptions {
    cellSize?: number;
    maxTextureDim?: number;
    minCellSize?: number;
    qualityScale?: number;
}

export interface VideoOptions extends RenderOptions {
    tickInterval: number;
    totalFrames: number;
    fps: number;
    onProgress?: (percent: number) => void;
}

export interface Mp4Options extends VideoOptions {
    bitrate?: number;
}
