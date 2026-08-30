import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { SelectedMap } from '@logic-arrows/game-logic/selected-map';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

interface SelectedMapPrivate {
    currentSelectionFirstPoint: [number, number] | undefined;
    currentSelectionSecondPoint: [number, number] | undefined;
    selectedArrows: Set<string>;
    currentSelectedArrows: Set<string>;
}

export const PatchSelectedMap: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'SelectedMap',
        (_module: typeof SelectedMap) => {
            return class SelectedMap extends _module {
                public deselect(x: number, y: number): void {
                    super.deselect(x, y);
                    const _this = this as any as SelectedMapPrivate;
                    _this.currentSelectedArrows.delete(`${x},${y}`);
                }

                public updateMouseSelection(
                    gameMap: GameMap,
                    mouseFloatX: number,
                    mouseFloatY: number,
                    selectionMode: 'new' | 'add' | 'remove',
                ): void {
                    // TIP: prob not needed
                    // if (selectionMode === 'new') this.clear();
                    this.updateCurrentSelectedArea(mouseFloatX, mouseFloatY);

                    const _this = this as any as SelectedMapPrivate;

                    if (
                        !_this.currentSelectionFirstPoint ||
                        !_this.currentSelectionSecondPoint
                    )
                        return;

                    const [fX1, fY1] = _this.currentSelectionFirstPoint;
                    const [fX2, fY2] = _this.currentSelectionSecondPoint;

                    const newArrowsList: [number, number][] = [];
                    const newArrowsPackedKeys = new Set<number>();

                    if (
                        Math.abs(fX1 - fX2) > 0.25 ||
                        Math.abs(fY1 - fY2) > 0.25
                    ) {
                        const minX = Math.floor(Math.min(fX1, fX2));
                        const maxX = Math.floor(Math.max(fX1, fX2));
                        const minY = Math.floor(Math.min(fY1, fY2));
                        const maxY = Math.floor(Math.max(fY1, fY2));

                        for (let i = minX; i <= maxX; i++) {
                            for (let j = minY; j <= maxY; j++) {
                                if (gameMap.getArrowType(i, j) !== 0) {
                                    newArrowsList.push([i, j]);
                                    newArrowsPackedKeys.add(
                                        (i << 16) | (j & 0xffff),
                                    );
                                }
                            }
                        }
                    }

                    const len = newArrowsList.length;

                    if (selectionMode === 'remove') {
                        for (let k = 0; k < len; k++) {
                            const [x, y] = newArrowsList[k];
                            if (_this.selectedArrows.has(`${x},${y}`)) {
                                this.deselect(x, y);
                            }
                        }
                    } else {
                        for (let k = 0; k < len; k++) {
                            const [x, y] = newArrowsList[k];
                            if (
                                !_this.selectedArrows.has(`${x},${y}`) &&
                                !_this.currentSelectedArrows.has(`${x},${y}`)
                            ) {
                                this.select(x, y);
                            }
                        }

                        if (selectionMode === 'new') {
                            _this.selectedArrows.forEach((arKey) => {
                                const [x, y] = arKey.split(',').map(Number);
                                const packedKey = (x << 16) | (y & 0xffff);

                                if (!newArrowsPackedKeys.has(packedKey)) {
                                    this.deselect(x, y);
                                }
                            });
                        }
                        _this.currentSelectedArrows.forEach((arKey) => {
                            const [x, y] = arKey.split(',').map(Number);
                            const packedKey = (x << 16) | (y & 0xffff);

                            if (!newArrowsPackedKeys.has(packedKey)) {
                                this.deselect(x, y);
                            }
                        });
                    }
                }
            };
        },
    );
};
