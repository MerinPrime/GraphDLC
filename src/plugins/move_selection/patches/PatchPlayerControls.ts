import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { MouseHandler } from '@logic-arrows/controls/mouse-handler';
import type { ArrowData } from '@logic-arrows/game-logic/arrow-data';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { PlayerMapAction } from '@logic-arrows/player/player-map-action';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { ArrowType } from 'src/core/utils/ArrowType';
import type { IPatcher } from '../../Patcher';
import type {
    MoveSelectionContext,
    MovingArrow,
    RenderMoveContext,
} from './types';

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
    origSet: ReadonlySet<number>,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): [readonly MovingArrow[], readonly MovingArrow[], readonly MovingArrow[]] {
    const dx = x0 - x1;
    const dy = y0 - y1;
    const len = items.length;

    if (dx === 0 && dy === 0) {
        const unionAB: MovingArrow[] = new Array(len);
        for (let i = 0; i < len; i++) {
            const item = items[i];
            unionAB[i] = { x: item.x + x0, y: item.y + y0, data: item.data };
        }
        return [[], [], unionAB];
    }

    const onlyA: MovingArrow[] = [];
    const onlyB: MovingArrow[] = [];
    const unionAB: MovingArrow[] = new Array(len);

    for (let i = 0; i < len; i++) {
        const item = items[i];
        const px = item.x;
        const py = item.y;

        unionAB[i] = { x: px + x1, y: py + y1, data: item.data };

        if (!origSet.has(packCoord(px + dx, py + dy))) {
            onlyA.push({ x: px + x0, y: py + y0, data: item.data });
        }

        if (!origSet.has(packCoord(px - dx, py - dy))) {
            onlyB.push(unionAB[i]);
        }
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

                private packedOrigSet = new Set<number>();
                private initialSelectionKeys = new Set<string>();

                private context: MoveSelectionContext = {
                    deltaX: 0,
                    deltaY: 0,
                    initArrows: [],
                };
                private renderMoveContext: RenderMoveContext = {
                    initArrows: [],
                    selection: [],
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

                        if (
                            selectedMap.selectedArrows.size === 0 &&
                            selectedMap.currentSelectedArrows.size === 0
                        ) {
                            super.update();
                            return;
                        }

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

                    this.context.deltaX = newDeltaX;
                    this.context.deltaY = newDeltaY;

                    const init = this.context.initArrows;
                    const selection = this.renderMoveContext.selection;
                    const len = init.length;

                    for (let i = 0; i < len; i++) {
                        selection[i].x = init[i].x + newDeltaX;
                        selection[i].y = init[i].y + newDeltaY;
                    }

                    _this.game.renderMoveContext = this.renderMoveContext;
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

                    this.packedOrigSet.clear();
                    this.initialSelectionKeys.clear();

                    const processKey = (arKey: string) => {
                        if (this.initialSelectionKeys.has(arKey)) return;
                        this.initialSelectionKeys.add(arKey);

                        const [x, y] = parseCoordKey(arKey);
                        const arrow = gameMap.getArrow(x, y);

                        this.context.initArrows.push({
                            x: x,
                            y: y,
                            data: _ArrowData.val.fromArrow(arrow),
                        });

                        this.packedOrigSet.add(packCoord(x, y));
                    };

                    selectedMap.selectedArrows.forEach(processKey);
                    selectedMap.currentSelectedArrows.forEach(processKey);

                    _this.game.selectedMap.clear();
                    _this.game.selectedMap.clearCurrentSelection();

                    const len = this.context.initArrows.length;
                    const selection: MovingArrow[] = new Array(len);
                    for (let i = 0; i < len; i++) {
                        const item = this.context.initArrows[i];
                        selection[i] = {
                            x: item.x,
                            y: item.y,
                            data: item.data,
                        };
                    }

                    this.renderMoveContext.initArrows = this.context.initArrows;
                    this.renderMoveContext.selection = selection;
                }

                public stopMoveSelection(): void {
                    const _this = this as any as PrivatePlayerControls;

                    const gameMap = _this.game.gameMap;
                    const selectedMap = _this.game.selectedMap;
                    const _selectedMap =
                        selectedMap as unknown as SelectedMapPrivate;

                    const newState = new _PlayerMapAction.val();

                    const dx = this.context.deltaX;
                    const dy = this.context.deltaY;

                    const [removeOld, _, selection] = getUniqueOffsets(
                        this.context.initArrows,
                        this.packedOrigSet,
                        0,
                        0,
                        dx,
                        dy,
                    );

                    for (let i = 0; i < removeOld.length; i++) {
                        const item = removeOld[i];
                        const posX = item.x;
                        const posY = item.y;

                        const [chunk, arrow] = gameMap.getOrCreateArrow(
                            posX,
                            posY,
                        );

                        const oldData = _ArrowData.val.fromArrow(arrow);
                        const newData = new _ArrowData.val();

                        newState.addChangedArrow(posX, posY, oldData, newData);

                        arrow.type = ArrowType.EMPTY;
                        arrow.rotation = 0;
                        arrow.flipped = false;
                        gameMap.updateArrowState(arrow, chunk, posX, posY);
                    }

                    selectedMap.clear();
                    selectedMap.clearCurrentSelection();
                    for (let i = 0; i < selection.length; i++) {
                        const item = selection[i];
                        const posX = item.x;
                        const posY = item.y;

                        const [chunk, arrow] = gameMap.getOrCreateArrow(
                            posX,
                            posY,
                        );

                        const oldData = _ArrowData.val.fromArrow(arrow);
                        const newData = item.data;

                        newState.addChangedArrow(posX, posY, oldData, newData);

                        arrow.type = item.data.type;
                        arrow.rotation = item.data.rotation;
                        arrow.flipped = item.data.flipped;
                        gameMap.updateArrowState(arrow, chunk, posX, posY);

                        selectedMap.select(posX, posY);
                    }

                    selectedMap.updateSelectionFromCurrentSelection();

                    (newState as any).oldSelection = new Set(
                        this.initialSelectionKeys,
                    );
                    (newState as any).newSelection = new Set([
                        ..._selectedMap.selectedArrows,
                        ..._selectedMap.currentSelectedArrows,
                    ]);

                    _this.history?.pushState(newState);
                    // @ts-expect-error
                    _this.history.lastChangeTime = Number.NEGATIVE_INFINITY;

                    _this.game.renderMoveContext = null;
                    this.isSelectionMoving = false;
                    this.startMousePos = undefined;
                    this.context.initArrows.length = 0;
                    this.context.deltaX = 0;
                    this.context.deltaY = 0;

                    this.renderMoveContext.initArrows = [];
                    this.renderMoveContext.selection = [];
                    this.packedOrigSet.clear();
                    this.initialSelectionKeys.clear();
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
                        selectedMap.clearCurrentSelection();
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
                    if (_this.history.states.length <= _this.history.current)
                        return;
                    // @ts-expect-error
                    const state = _this.history.states[
                        // @ts-expect-error
                        _this.history.current
                    ] as any;
                    if (state?.newSelection) {
                        selectedMap.clear();
                        selectedMap.clearCurrentSelection();
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
