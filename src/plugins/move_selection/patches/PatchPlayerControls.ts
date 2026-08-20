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

interface MovingArrow {
    origX: number;
    origY: number;
    data: ArrowData;
}

function parseCoordKey(key: string): [x: number, y: number] {
    const commaIndex = key.indexOf(',');
    return [+key.slice(0, commaIndex), +key.slice(commaIndex + 1)];
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
                private originalSelection: Set<string> = new Set();
                private movingArrows: MovingArrow[] = [];
                private oldArrowDatas: Map<string, ArrowData> = new Map();
                private delta: [x: number, y: number] = [0, 0];

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
                        newDeltaX === this.delta[0] &&
                        newDeltaY === this.delta[1]
                    ) {
                        return;
                    }

                    this.restoreSelection();

                    this.delta[0] = newDeltaX;
                    this.delta[1] = newDeltaY;

                    this.placeSelection();
                    this.updateSelectedMapKeys();
                }

                public startMoveSelection(): void {
                    const _this = this as any as PrivatePlayerControls;

                    const gameMap = _this.game.gameMap;
                    const selectedMap = _this.game
                        .selectedMap as unknown as SelectedMapPrivate;

                    this.isSelectionMoving = true;
                    this.startMousePos = _this.getPositionByMousePosition();
                    this.delta = [0, 0];
                    this.movingArrows.length = 0;
                    this.originalSelection = new Set([
                        ...selectedMap.selectedArrows,
                        ...selectedMap.currentSelectedArrows,
                    ]);

                    for (const arKey of this.originalSelection) {
                        const [x, y] = parseCoordKey(arKey);
                        const arrow = gameMap.getArrow(x, y);

                        this.movingArrows.push({
                            origX: x,
                            origY: y,
                            data: _ArrowData.val.fromArrow(arrow),
                        });

                        this.oldArrowDatas.set(arKey, new _ArrowData.val());

                        gameMap.removeArrow(x, y);
                    }

                    this.placeSelection();
                }

                public stopMoveSelection(): void {
                    const _this = this as any as PrivatePlayerControls;

                    const gameMap = _this.game.gameMap;
                    const selectedMap = _this.game
                        .selectedMap as unknown as SelectedMapPrivate;

                    const newState = new _PlayerMapAction.val();

                    for (let i = 0; i < this.movingArrows.length; i++) {
                        const item = this.movingArrows[i];
                        newState.addChangedArrow(
                            item.origX,
                            item.origY,
                            item.data,
                            new ArrowData(),
                        );
                    }

                    const [dx, dy] = this.delta;

                    for (let i = 0; i < this.movingArrows.length; i++) {
                        const item = this.movingArrows[i];
                        const posX = item.origX + dx;
                        const posY = item.origY + dy;
                        const arKey = `${item.origX + dx},${item.origY + dy}`;

                        const [_, arrow] = gameMap.getOrCreateArrow(posX, posY);

                        if (!this.oldArrowDatas.has(arKey)) {
                            continue;
                        }

                        const oldData =
                            this.oldArrowDatas.get(arKey) ??
                            new _ArrowData.val();

                        const newData = _ArrowData.val.fromArrow(arrow);

                        newState.addChangedArrow(posX, posY, oldData, newData);
                    }

                    (newState as any).oldSelection = this.originalSelection;
                    (newState as any).newSelection = new Set([
                        ...selectedMap.selectedArrows,
                        ...selectedMap.currentSelectedArrows,
                    ]);
                    _this.history?.pushState(newState);
                    (_this.history as any).lastChangeTime =
                        Number.NEGATIVE_INFINITY;

                    this.isSelectionMoving = false;
                    this.startMousePos = undefined;
                    this.movingArrows.length = 0;
                    this.oldArrowDatas.clear();
                    this.delta = [0, 0];
                }

                private placeSelection(): void {
                    const _this = this as any as PrivatePlayerControls;

                    const gameMap = _this.game.gameMap;
                    const [dx, dy] = this.delta;

                    for (let i = 0; i < this.movingArrows.length; i++) {
                        const item = this.movingArrows[i];
                        const posX = item.origX + dx;
                        const posY = item.origY + dy;
                        const arKey = `${item.origX + dx},${item.origY + dy}`;

                        if (!this.oldArrowDatas.has(arKey)) {
                            const [_, arrow] = gameMap.getOrCreateArrow(
                                posX,
                                posY,
                            );
                            this.oldArrowDatas.set(
                                arKey,
                                _ArrowData.val.fromArrow(arrow),
                            );
                        }

                        this.applyArrowData(
                            item.origX + dx,
                            item.origY + dy,
                            item.data,
                        );
                    }

                    _this.game.screenUpdated = true;
                }

                public restoreSelection(): void {
                    const _this = this as any as PrivatePlayerControls;

                    const [dx, dy] = this.delta;

                    for (let i = 0; i < this.movingArrows.length; i++) {
                        const item = this.movingArrows[i];
                        const arKey = `${item.origX + dx},${item.origY + dy}`;
                        const oldData =
                            this.oldArrowDatas.get(arKey) ??
                            new _ArrowData.val();
                        this.applyArrowData(
                            item.origX + dx,
                            item.origY + dy,
                            oldData,
                        );
                    }
                    _this.game.screenUpdated = true;
                }

                private updateSelectedMapKeys(): void {
                    const _this = this as any as PrivatePlayerControls;

                    const selectedMap = _this.game.selectedMap;
                    const _selectedMap =
                        selectedMap as unknown as SelectedMapPrivate;
                    const [dx, dy] = this.delta;

                    const oldSelectedArrows = new Set([
                        ..._selectedMap.selectedArrows,
                        ..._selectedMap.currentSelectedArrows,
                    ]);
                    const newSelectedArrows = new Set<string>();
                    for (let i = 0; i < this.movingArrows.length; i++) {
                        const item = this.movingArrows[i];
                        newSelectedArrows.add(
                            `${item.origX + dx},${item.origY + dy}`,
                        );
                    }
                    oldSelectedArrows.forEach((old) => {
                        if (newSelectedArrows.has(old)) return;
                        const [x, y] = parseCoordKey(old);
                        selectedMap.deselect(x, y);
                    });
                    newSelectedArrows.forEach((value) => {
                        if (oldSelectedArrows.has(value)) return;
                        const [x, y] = parseCoordKey(value);
                        selectedMap.select(x, y);
                    });
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
