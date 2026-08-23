import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { MouseHandler } from '@logic-arrows/controls/mouse-handler';
import { ArrowData } from '@logic-arrows/game-logic/arrow-data';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { PlayerMapAction } from '@logic-arrows/player/player-map-action';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import type { MoveSelectionContext, MovingArrow } from './types';

interface PrivatePlayerControls {
    readonly game: Game;
    readonly mouseHandler: MouseHandler;
    readonly keyboardHandler: KeyboardHandler;
    readonly playerUI: PlayerUI;
    readonly history: GameHistory | null;
    getPositionByMousePosition(): [x: number, y: number];
}

interface SelectedMapPrivate {
    selectedArrows: Set<string>;
    currentSelectedArrows: Set<string>;
}

function parseCoordKey(key: string): [x: number, y: number] {
    const commaIndex = key.indexOf(',');
    return [+key.slice(0, commaIndex), +key.slice(commaIndex + 1)];
}

function packCoord(x: number, y: number): number {
    return (((x + 32768) & 0xffff) << 16) | ((y + 32768) & 0xffff);
}

export function getUniqueOffsets(
    items: readonly MovingArrow[],
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): [readonly MovingArrow[], readonly MovingArrow[], readonly MovingArrow[]] {
    const dx = x0 - x1;
    const dy = y0 - y1;

    if (dx === 0 && dy === 0) {
        const unionAB: MovingArrow[] = new Array(items.length);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            unionAB[i] = { x: item.x + x0, y: item.y + y0, data: item.data };
        }
        return [[], [], unionAB];
    }

    const origSet = new Set<number>();
    for (let i = 0; i < items.length; i++) {
        origSet.add(packCoord(items[i].x, items[i].y));
    }

    const onlyA: MovingArrow[] = [];
    const onlyB: MovingArrow[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const px = item.x;
        const py = item.y;

        if (!origSet.has(packCoord(px + dx, py + dy))) {
            onlyA.push({ x: px + x0, y: py + y0, data: item.data });
        }

        if (!origSet.has(packCoord(px - dx, py - dy))) {
            onlyB.push({ x: px + x1, y: py + y1, data: item.data });
        }
    }

    const unionAB: MovingArrow[] = new Array(items.length);

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        unionAB[i] = { x: item.x + x1, y: item.y + y1, data: item.data };
    }

    return [onlyA, onlyB, unionAB];
}

export const PatchPlayerControls: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'PlayerControls',
        (_module: typeof PlayerControls) => {
            const _ArrowData =
                patchLoader.getDefinition<typeof ArrowData>('ArrowData');
            const _PlayerMapAction =
                patchLoader.getDefinition<typeof PlayerMapAction>(
                    'PlayerMapAction',
                );

            // @ts-expect-error
            return class PlayerControls extends _module {
                private isSelectionMoving = false;
                private startMousePos: [x: number, y: number] | undefined =
                    undefined;
                private context: MoveSelectionContext = {
                    deltaX: 0,
                    deltaY: 0,
                    initArrows: [],
                    mapSnapshot: new Map(),
                };

                public update(): void {
                    const _this = this as any as PrivatePlayerControls;
                    const keyboard = _this.keyboardHandler;
                    const mouse = _this.mouseHandler;

                    if (keyboard.getCtrlPressed() && mouse.getMousePressed()) {
                        if (this.isSelectionMoving) {
                            this.handleMoveSelection();
                            return;
                        }

                        const selectedMap = _this.game
                            .selectedMap as unknown as SelectedMapPrivate;
                        const [mouseX, mouseY] =
                            _this.getPositionByMousePosition();
                        const arKey = `${mouseX},${mouseY}`;

                        if (
                            selectedMap.selectedArrows.has(arKey) ||
                            selectedMap.currentSelectedArrows.has(arKey)
                        ) {
                            this.startMoveSelection();
                            return;
                        }
                    } else if (this.isSelectionMoving) {
                        this.stopMoveSelection();
                    }

                    super.update();
                }

                public handleMoveSelection(): void {
                    if (!this.startMousePos) return;

                    const _this = this as any as PrivatePlayerControls;

                    const [curX, curY] = _this.getPositionByMousePosition();
                    const newDeltaX = curX - this.startMousePos[0];
                    const newDeltaY = curY - this.startMousePos[1];

                    if (
                        newDeltaX === this.context.deltaX &&
                        newDeltaY === this.context.deltaY
                    ) {
                        return;
                    }

                    const [removeOld, placeNew, selection] = getUniqueOffsets(
                        this.context.initArrows,
                        this.context.deltaX,
                        this.context.deltaY,
                        newDeltaX,
                        newDeltaY,
                    );

                    this.context.deltaX = newDeltaX;
                    this.context.deltaY = newDeltaY;

                    this.restoreSelection(removeOld);
                    this.placeSelection(selection);
                    this.updateSelectedMapKeys(removeOld, placeNew);

                    _this.game.screenUpdated = true;
                }

                public startMoveSelection(): void {
                    const _this = this as any as PrivatePlayerControls;

                    const gameMap = _this.game.gameMap;
                    const selectedMap = _this.game
                        .selectedMap as unknown as SelectedMapPrivate;

                    this.isSelectionMoving = true;
                    this.startMousePos = _this.getPositionByMousePosition();
                    this.context.deltaX = 0;
                    this.context.deltaY = 0;
                    this.context.initArrows.length = 0;

                    const selection = new Set([
                        ...selectedMap.selectedArrows,
                        ...selectedMap.currentSelectedArrows,
                    ]);
                    for (const arKey of selection) {
                        const [x, y] = parseCoordKey(arKey);
                        const arrow = gameMap.getArrow(x, y);

                        this.context.initArrows.push({
                            x: x,
                            y: y,
                            data: _ArrowData.val.fromArrow(arrow),
                        });

                        this.context.mapSnapshot.set(
                            packCoord(x, y),
                            new _ArrowData.val(),
                        );

                        gameMap.removeArrow(x, y);
                    }

                    this.placeSelection(this.context.initArrows);
                }

                public stopMoveSelection(): void {
                    const _this = this as any as PrivatePlayerControls;

                    const gameMap = _this.game.gameMap;
                    const selectedMap = _this.game
                        .selectedMap as unknown as SelectedMapPrivate;

                    const newState = new _PlayerMapAction.val();

                    for (let i = 0; i < this.context.initArrows.length; i++) {
                        const item = this.context.initArrows[i];
                        newState.addChangedArrow(
                            item.x,
                            item.y,
                            item.data,
                            new ArrowData(),
                        );
                    }

                    const dx = this.context.deltaX;
                    const dy = this.context.deltaY;
                    const oldSelection = new Set<string>();

                    for (let i = 0; i < this.context.initArrows.length; i++) {
                        const item = this.context.initArrows[i];

                        oldSelection.add(`${item.x},${item.y}`);

                        const posX = item.x + dx;
                        const posY = item.y + dy;

                        const arKey = packCoord(posX, posY);
                        const [_, arrow] = gameMap.getOrCreateArrow(posX, posY);

                        if (!this.context.mapSnapshot.has(arKey)) {
                            continue;
                        }

                        const oldData =
                            this.context.mapSnapshot.get(arKey) ??
                            new _ArrowData.val();

                        const newData = _ArrowData.val.fromArrow(arrow);

                        newState.addChangedArrow(posX, posY, oldData, newData);
                    }

                    (newState as any).oldSelection = oldSelection;
                    (newState as any).newSelection = new Set([
                        ...selectedMap.selectedArrows,
                        ...selectedMap.currentSelectedArrows,
                    ]);
                    _this.history?.pushState(newState);
                    // @ts-expect-error
                    _this.history.lastChangeTime = Number.NEGATIVE_INFINITY;

                    this.isSelectionMoving = false;
                    this.startMousePos = undefined;
                    this.context.initArrows.length = 0;
                    this.context.mapSnapshot.clear();
                    this.context.deltaX = 0;
                    this.context.deltaY = 0;
                }

                private placeSelection(points: readonly MovingArrow[]): void {
                    const _this = this as any as PrivatePlayerControls;

                    const gameMap = _this.game.gameMap;

                    for (let i = 0; i < points.length; i++) {
                        const { x, y, data } = points[i];
                        const arKey = packCoord(x, y);

                        if (!this.context.mapSnapshot.has(arKey)) {
                            const [_, arrow] = gameMap.getOrCreateArrow(x, y);
                            this.context.mapSnapshot.set(
                                arKey,
                                _ArrowData.val.fromArrow(arrow),
                            );
                        }

                        this.applyArrowData(x, y, data);
                    }
                }

                public restoreSelection(
                    oldPoints: readonly MovingArrow[],
                ): void {
                    for (let i = 0; i < oldPoints.length; i++) {
                        const { x, y } = oldPoints[i];
                        const arKey = packCoord(x, y);
                        const oldData =
                            this.context.mapSnapshot.get(arKey) ??
                            new _ArrowData.val();
                        this.applyArrowData(x, y, oldData);
                    }
                }

                private updateSelectedMapKeys(
                    removePoints: readonly MovingArrow[],
                    addPoints: readonly MovingArrow[],
                ): void {
                    const _this = this as any as PrivatePlayerControls;

                    const selectedMap = _this.game.selectedMap;

                    for (let i = 0; i < removePoints.length; i++) {
                        const item = removePoints[i];
                        selectedMap.deselect(item.x, item.y);
                    }

                    for (let i = 0; i < addPoints.length; i++) {
                        const item = addPoints[i];
                        selectedMap.select(item.x, item.y);
                    }
                }

                private applyArrowData(
                    x: number,
                    y: number,
                    data: ArrowData,
                ): void {
                    const _this = this as any as PrivatePlayerControls;

                    const gameMap = _this.game.gameMap;
                    const [chunk, arrow] = gameMap.getOrCreateArrow(x, y);

                    arrow.type = data.type;
                    arrow.rotation = data.rotation;
                    arrow.flipped = data.flipped;

                    gameMap.updateArrowState(arrow, chunk, x, y);
                    chunk.markRenderDirty();
                }

                public undo(): void {
                    const _this = this as any as PrivatePlayerControls;

                    const selectedMap = _this.game.selectedMap;

                    // @ts-expect-error
                    super.undo();

                    // @ts-expect-error
                    if (_this.history.states.length <= _this.history.current)
                        return;
                    // @ts-expect-error
                    const state = _this.history.states[
                        // @ts-expect-error
                        _this.history.current + 1
                    ] as any;
                    if (state?.oldSelection) {
                        selectedMap.clear();
                        state.oldSelection.forEach((arKey: string) => {
                            const [x, y] = parseCoordKey(arKey);
                            selectedMap.select(x, y);
                        });
                    }
                }

                public redo(): void {
                    const _this = this as any as PrivatePlayerControls;

                    const selectedMap = _this.game.selectedMap;

                    // @ts-expect-error
                    super.redo();

                    // @ts-expect-error
                    const state = _this.history.states[
                        // @ts-expect-error
                        _this.history.current
                    ] as any;
                    if (state?.newSelection) {
                        selectedMap.clear();
                        state.newSelection.forEach((arKey: string) => {
                            const [x, y] = parseCoordKey(arKey);
                            selectedMap.select(x, y);
                        });
                    }
                }
            };
        },
    );
};
