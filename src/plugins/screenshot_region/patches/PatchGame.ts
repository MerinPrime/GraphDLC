import { CELL_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import type { AreaBounds, RenderOptions } from './types';

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
                const NATIVE = 256;
                const MIN = options.minCellSize ?? 16;

                const optimal = Math.floor(MAX_DIM / maxCells);
                let clamped = Math.max(MIN, Math.min(NATIVE, optimal));
                if (clamped > 32) clamped = Math.floor(clamped / 2) * 2;

                if (options.qualityScale && options.qualityScale > 0) {
                    clamped = Math.max(
                        8,
                        Math.floor(clamped * options.qualityScale),
                    );
                }

                return clamped;
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
                    this.draw();
                }

                return outputCanvas;
            }

            public async copySelectedAreaImageToClipboard(
                options?: RenderOptions,
            ): Promise<boolean> {
                const selection = this.getSelectionBounds();
                if (!selection) return false;

                const canvas = this.renderRegionToCanvas(
                    selection.area,
                    selection.selectedSet,
                    options,
                );
                if (!canvas) return false;

                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob((b) => resolve(b), 'image/png');
                });
                if (!blob) return false;

                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob }),
                    ]);
                    return true;
                } catch (err) {
                    console.error('Screenshot clipboard error:', err);
                    return false;
                }
            }
        };
    });
};
