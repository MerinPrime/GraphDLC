import { CELL_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import UPNG from '@pdf-lib/upng';
// @ts-expect-error
import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import type {
    AreaBounds,
    Mp4Options,
    RenderOptions,
    VideoOptions,
} from './types';

interface PrivateGame {
    gameMap: GameMap;
    readonly render: GameRender;
}

export const PatchGame: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('Game', (_module: typeof Game) => {
        return class Game extends _module {
            public getSelectionBounds(): {
                area: AreaBounds;
                selectedSet: Set<string>;
            } | null {
                let area: AreaBounds | undefined =
                    this.selectedMap.getCurrentSelectedArea();
                const selectedArrows = this.selectedMap.getSelectedArrows();
                const selectedSet = new Set(selectedArrows);

                if (!area) {
                    if (selectedArrows.length === 0) return null;

                    let minX = Infinity,
                        minY = Infinity;
                    let maxX = -Infinity,
                        maxY = -Infinity;

                    for (const posStr of selectedArrows) {
                        const [x, y] = posStr
                            .split(',')
                            .map((v: string) => parseInt(v, 10));
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x + 1);
                        maxY = Math.max(maxY, y + 1);
                    }
                    area = [minX, minY, maxX, maxY];
                }

                const paddedArea: AreaBounds = [
                    area[0] - 1,
                    area[1] - 1,
                    area[2] + 1,
                    area[3] + 1,
                ];

                return { area: paddedArea, selectedSet };
            }

            private calculateCellSize(
                widthCells: number,
                heightCells: number,
                options: RenderOptions = {},
            ): number {
                if (options.cellSize) return options.cellSize;

                const maxCells = Math.max(widthCells, heightCells);
                const MAX_DIM = options.maxTextureDim ?? 4096;
                const MAX_CELL_SIZE = 64;
                const MIN_CELL_SIZE = options.minCellSize ?? 4;

                const fitCellSize = Math.floor(MAX_DIM / maxCells);

                let size = Math.min(MAX_CELL_SIZE, fitCellSize);

                if (size < MIN_CELL_SIZE) {
                    size = Math.max(1, fitCellSize);
                }

                if (size > 8) {
                    size = Math.floor(size / 2) * 2;
                }

                if (options.qualityScale && options.qualityScale > 0) {
                    size = Math.max(1, Math.floor(size * options.qualityScale));
                }

                return size;
            }

            public renderRegionToCanvas(
                area: AreaBounds,
                selectedSet?: Set<string>,
                options: RenderOptions = {},
            ): HTMLCanvasElement | null {
                const _this = this as any as PrivateGame;
                if (!_this.render) return null;

                const gameCanvas = (_this.render as any)
                    .canvas as HTMLCanvasElement;
                if (!gameCanvas) return null;

                const [minX, minY, maxX, maxY] = area;
                const widthCells = maxX - minX;
                const heightCells = maxY - minY;
                if (widthCells <= 0 || heightCells <= 0) return null;

                const cellSize = this.calculateCellSize(
                    widthCells,
                    heightCells,
                    options,
                );
                const targetWidth = widthCells * cellSize;
                const targetHeight = heightCells * cellSize;

                const outputCanvas = document.createElement('canvas');
                outputCanvas.width = targetWidth;
                outputCanvas.height = targetHeight;
                const ctx = outputCanvas.getContext('2d');
                if (!ctx) return null;

                const savedWidth = this.width;
                const savedHeight = this.height;
                const savedScale = this.scale;
                const savedOffset: [number, number] = [
                    this.offset[0],
                    this.offset[1],
                ];
                const savedIsSelecting = this.isSelecting;
                const savedDrawPasted = this.drawPastedArrows;
                const savedSelectedArrows = (this.selectedMap as any)
                    .selectedArrows;
                const savedCurrentSelectedArrows = (this.selectedMap as any)
                    .currentSelectedArrows;

                try {
                    this.scale = cellSize;
                    this.offset[0] = -minX * CELL_SIZE - this.scale * 0.025;
                    this.offset[1] = -minY * CELL_SIZE - this.scale * 0.025;

                    this.isSelecting = false;
                    this.drawPastedArrows = false;
                    (this.selectedMap as any).selectedArrows = [];
                    (this.selectedMap as any).currentSelectedArrows = [];

                    if (
                        typeof (_this.render as any).clearArrow === 'function'
                    ) {
                        for (let gx = minX; gx < maxX; gx++) {
                            for (let gy = minY; gy < maxY; gy++) {
                                const isBorder =
                                    gx === minX ||
                                    gx === maxX - 1 ||
                                    gy === minY ||
                                    gy === maxY - 1;
                                const isUnselected =
                                    selectedSet !== undefined &&
                                    selectedSet.size > 0 &&
                                    !selectedSet.has(`${gx},${gy}`);

                                if (isBorder || isUnselected) {
                                    const px = (gx - minX) * cellSize;
                                    const py = (gy - minY) * cellSize;
                                    (_this.render as any).clearArrow(
                                        px,
                                        py,
                                        cellSize,
                                    );
                                }
                            }
                        }
                    }

                    this.resize(targetWidth, targetHeight);
                    this.screenUpdated = true;
                    // @ts-expect-error
                    this.render?.setDisableSolidColor(!options.showSolidColor);
                    this.draw();

                    ctx.drawImage(gameCanvas, 0, 0);
                } finally {
                    this.scale = savedScale;
                    this.offset[0] = savedOffset[0];
                    this.offset[1] = savedOffset[1];
                    this.isSelecting = savedIsSelecting;
                    this.drawPastedArrows = savedDrawPasted;
                    (this.selectedMap as any).selectedArrows =
                        savedSelectedArrows;
                    (this.selectedMap as any).currentSelectedArrows =
                        savedCurrentSelectedArrows;

                    this.resize(savedWidth, savedHeight);
                    this.screenUpdated = true;
                    // @ts-expect-error
                    this.render?.setDisableSolidColor(false);
                    this.draw();
                }

                return outputCanvas;
            }

            public async captureScreenshot(
                options?: RenderOptions,
            ): Promise<Blob | null> {
                const selection = this.getSelectionBounds();
                if (!selection) return null;

                const canvas = this.renderRegionToCanvas(
                    selection.area,
                    selection.selectedSet,
                    options,
                );
                if (!canvas) return null;

                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob((b) => resolve(b), 'image/png');
                });
                if (!blob) return null;

                return blob;
            }

            private async captureFrames(
                options: VideoOptions,
                handlers: {
                    onFrame: (
                        frame: HTMLCanvasElement,
                        index: number,
                    ) => Promise<void> | void;
                    onFinish: () => Promise<Blob | null> | Blob | null;
                },
            ): Promise<Blob | null> {
                const selection = this.getSelectionBounds();
                if (!selection) return null;

                const totalFrames = options.totalFrames ?? 30;
                const tickInterval = options.tickInterval ?? 1;

                for (let i = 0; i < totalFrames; i++) {
                    const frame = this.renderRegionToCanvas(
                        selection.area,
                        selection.selectedSet,
                        options,
                    );

                    if (frame) {
                        await handlers.onFrame(frame, i);
                    }

                    options.onProgress?.(
                        Math.round(((i + 1) / totalFrames) * 100),
                    );

                    if (i < totalFrames - 1) {
                        this.gameMap.graph.engine.runManyTicks(tickInterval);
                        await new Promise((resolve) => setTimeout(resolve, 0));
                    }
                }

                return await handlers.onFinish();
            }

            public async renderGif(
                options: VideoOptions,
            ): Promise<Blob | null> {
                const fps = Math.min(options.fps ?? 10, 50);
                const delay = Math.round(1000 / fps);
                const maxColors = 64;

                const gif = GIFEncoder();

                return this.captureFrames(options, {
                    onFrame: (frame) => {
                        const width = frame.width;
                        const height = frame.height;
                        const ctx = frame.getContext('2d');
                        if (!ctx) throw new Error('2d context not found');

                        const imageData = ctx.getImageData(
                            0,
                            0,
                            width,
                            height,
                        ).data;
                        const palette = quantize(imageData, maxColors);
                        const index = applyPalette(imageData, palette);

                        gif.writeFrame(index, width, height, {
                            palette,
                            delay,
                        });
                    },
                    onFinish: () => {
                        gif.finish();
                        return new Blob([gif.bytes()], { type: 'image/gif' });
                    },
                });
            }

            public async renderApng(
                options: VideoOptions,
            ): Promise<Blob | null> {
                const fps = options.fps && options.fps > 0 ? options.fps : 60;
                const delay = Math.round(1000 / fps);

                const frameBuffers: ArrayBuffer[] = [];
                let width = 0;
                let height = 0;

                return this.captureFrames(options, {
                    onFrame: (frame) => {
                        width = frame.width;
                        height = frame.height;
                        const ctx = frame.getContext('2d');
                        if (!ctx) throw new Error('2d context not found');

                        const imageData = ctx.getImageData(0, 0, width, height);
                        frameBuffers.push(imageData.data.buffer);
                    },
                    onFinish: () => {
                        if (frameBuffers.length === 0) return null;
                        const delays = new Array(frameBuffers.length).fill(
                            delay,
                        );
                        const pngBuffer = UPNG.encode(
                            frameBuffers,
                            width,
                            height,
                            0,
                            delays,
                        );
                        return new Blob([pngBuffer], { type: 'image/png' });
                    },
                });
            }

            public async renderMp4(options: Mp4Options): Promise<Blob | null> {
                const fps = options.fps && options.fps > 0 ? options.fps : 60;
                const bitrate = options.bitrate ?? 8_000_000;

                let muxer: Muxer<ArrayBufferTarget> | null = null;
                let videoEncoder: VideoEncoder | null = null;

                return this.captureFrames(options, {
                    onFrame: (frame, i) => {
                        const width = Math.floor(frame.width / 2) * 2;
                        const height = Math.floor(frame.height / 2) * 2;

                        if (!muxer || !videoEncoder) {
                            muxer = new Muxer({
                                target: new ArrayBufferTarget(),
                                video: {
                                    codec: 'avc',
                                    width,
                                    height,
                                },
                                fastStart: 'in-memory',
                            });

                            videoEncoder = new VideoEncoder({
                                output: (chunk, meta) =>
                                    muxer!.addVideoChunk(chunk, meta),
                                error: (e) =>
                                    console.error('VideoEncoder error:', e),
                            });

                            videoEncoder.configure({
                                codec: 'avc1.4d0033',
                                width,
                                height,
                                bitrate,
                            });
                        }

                        const videoFrame = new VideoFrame(frame, {
                            timestamp: Math.round((i * 1_000_000) / fps),
                            visibleRect: { x: 0, y: 0, width, height },
                        });

                        videoEncoder.encode(videoFrame, {
                            keyFrame: i % 30 === 0,
                        });
                        videoFrame.close();
                    },
                    onFinish: async () => {
                        if (!muxer || !videoEncoder) return null;
                        await videoEncoder.flush();
                        muxer.finalize();
                        return new Blob([muxer.target.buffer], {
                            type: 'video/mp4',
                        });
                    },
                });
            }
        };
    });
};
