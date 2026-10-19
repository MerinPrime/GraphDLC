export type AreaBounds = [number, number, number, number];

export type ExportFormat = 'png' | 'gif' | 'apng' | 'mp4';

export interface RenderOptions {
    cellSize?: number;
    maxTextureDim?: number;
    minCellSize?: number;
    qualityScale?: number;
    showSolidColor?: boolean;
}

export interface BaseVideoOptions extends RenderOptions {
    tickInterval: number;
    totalFrames: number;
    fps: number;
    format?: ExportFormat;
    onProgress?: (
        percent: number,
        curFrame: number,
        totalFrames: number,
    ) => void;
    signal?: AbortSignal;
    stopSignal?: AbortSignal;
}

export interface VideoOptions extends BaseVideoOptions {
    format: 'gif' | 'apng';
}

export interface Mp4Options extends BaseVideoOptions {
    format: 'mp4';
    bitrate?: number;
}

export type AnyRecordOptions = VideoOptions | Mp4Options;
