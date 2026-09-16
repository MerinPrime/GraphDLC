import { CELL_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

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
            private onKeyDownBound = (e: KeyboardEvent) =>
                this.handleKeyDown(e);

            public constructor(...args: any[]) {
                // @ts-expect-error
                super(...args);
                window.addEventListener('keydown', this.onKeyDownBound);
            }

            public override dispose(): void {
                window.removeEventListener('keydown', this.onKeyDownBound);
                super.dispose();
            }

            private async handleKeyDown(e: KeyboardEvent): Promise<void> {
                if (
                    e.target instanceof HTMLInputElement ||
                    e.target instanceof HTMLTextAreaElement
                ) {
                    return;
                }

                if (e.code === 'KeyL') {
                    const success =
                        await this.copySelectedAreaImageToClipboard();
                    if (success) {
                        console.log('Screenshot');
                    }
                }
            }

            private calculateAdaptiveCellSize(
                widthCells: number,
                heightCells: number,
            ): number {
                const maxCells = Math.max(widthCells, heightCells);
                const MAX_TEXTURE_DIM = 4096;
                const NATIVE_SPRITE_SIZE = 256;
                const MIN_CELL_SIZE = 16;

                const optimalSize = Math.floor(MAX_TEXTURE_DIM / maxCells);
                const clamped = Math.max(
                    MIN_CELL_SIZE,
                    Math.min(NATIVE_SPRITE_SIZE, optimalSize),
                );
                return clamped > 32 ? Math.floor(clamped / 2) * 2 : clamped;
            }

            public async copyRegionImageToClipboard(
                x0: number,
                y0: number,
                x1: number,
                y1: number,
                selectedSet?: Set<string>,
                originalArea?: [number, number, number, number],
            ): Promise<boolean> {
                const _this = this as any as PrivateGame;
                if (!_this.render) return false;

                const canvas = (_this.render as any)
                    .canvas as HTMLCanvasElement;
                if (!canvas) return false;

                const minX = Math.min(x0, x1);
                const maxX = Math.max(x0, x1);
                const minY = Math.min(y0, y1);
                const maxY = Math.max(y0, y1);

                const widthCells = maxX - minX;
                const heightCells = maxY - minY;
                if (widthCells <= 0 || heightCells <= 0) return false;

                const cellSize = this.calculateAdaptiveCellSize(
                    widthCells,
                    heightCells,
                );
                const targetWidth = widthCells * cellSize;
                const targetHeight = heightCells * cellSize;

                const savedWidth = this.width;
                const savedHeight = this.height;
                const savedScale = this.scale;
                const savedOffset: [number, number] = [
                    this.offset[0],
                    this.offset[1],
                ];
                const savedIsSelecting = this.isSelecting;
                const savedDrawPasted = this.drawPastedArrows;
                // @ts-expect-error
                const savedSelectedArrows = this.selectedMap.selectedArrows;
                const savedCurrentSelectedArrows =
                    // @ts-expect-error
                    this.selectedMap.currentSelectedArrows;

                const canvas2d = document.createElement('canvas');
                canvas2d.width = targetWidth;
                canvas2d.height = targetHeight;
                const ctx = canvas2d.getContext('2d');
                if (!ctx) return false;

                try {
                    this.scale = cellSize;
                    this.offset[0] = -minX * CELL_SIZE - this.scale * 0.025;
                    this.offset[1] = -minY * CELL_SIZE - this.scale * 0.025;

                    this.isSelecting = false;
                    this.drawPastedArrows = false;
                    // @ts-expect-error
                    this.selectedMap.selectedArrows = [];
                    // @ts-expect-error
                    this.selectedMap.currentSelectedArrows = [];

                    if (
                        typeof (_this.render as any).clearArrow === 'function'
                    ) {
                        for (let gx = minX; gx < maxX; gx++) {
                            for (let gy = minY; gy < maxY; gy++) {
                                const isBorder =
                                    originalArea !== undefined &&
                                    (gx < originalArea[0] ||
                                        gx >= originalArea[2] ||
                                        gy < originalArea[1] ||
                                        gy >= originalArea[3]);

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

                    ctx.drawImage(canvas, 0, 0);
                } finally {
                    this.scale = savedScale;
                    this.offset[0] = savedOffset[0];
                    this.offset[1] = savedOffset[1];
                    this.isSelecting = savedIsSelecting;
                    this.drawPastedArrows = savedDrawPasted;
                    // @ts-expect-error
                    this.selectedMap.selectedArrows = savedSelectedArrows;
                    // @ts-expect-error
                    this.selectedMap.currentSelectedArrows =
                        savedCurrentSelectedArrows;

                    this.resize(savedWidth, savedHeight);
                    this.screenUpdated = true;
                    this.draw();
                }

                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas2d.toBlob((b) => resolve(b), 'image/png');
                });

                if (!blob) return false;

                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob }),
                    ]);
                    return true;
                } catch (err) {
                    console.error('Screenshot error:', err);
                    return false;
                }
            }

            public async copySelectedAreaImageToClipboard(): Promise<boolean> {
                let area: [number, number, number, number] | undefined =
                    this.selectedMap.getCurrentSelectedArea();

                const selectedArrows = this.selectedMap.getSelectedArrows();
                const selectedSet = new Set(selectedArrows);

                if (!area) {
                    if (selectedArrows.length === 0) return false;

                    let minX = Infinity;
                    let minY = Infinity;
                    let maxX = -Infinity;
                    let maxY = -Infinity;

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

                return this.copyRegionImageToClipboard(
                    area[0] - 1,
                    area[1] - 1,
                    area[2] + 1,
                    area[3] + 1,
                    selectedSet,
                    area,
                );
            }
        };
    });
};
