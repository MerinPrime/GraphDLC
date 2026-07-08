import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { MouseHandler } from '@logic-arrows/controls/mouse-handler';
import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { ArrowData } from '@logic-arrows/game-logic/arrow-data';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerArrowActions } from '@logic-arrows/player/player-arrow-actions';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import { NodeSignal } from 'src/core/graph/engines/core/NodeSignal';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { PathStep } from 'src/core/path_finder/types';
import type { IPatcher } from '../Patcher';

interface PrivatePlayerControls {
    readonly playerUI: PlayerUI;
    readonly game: Game;
    readonly keyboardHandler: KeyboardHandler;
    readonly history: GameHistory | null;
    readonly mouseHandler: MouseHandler;
    readonly arrowActions: PlayerArrowActions;

    getArrowByMousePosition(): Arrow | undefined;
    getPositionByMousePosition(): [x: number, y: number];
}

interface PathData {
    startPathX: number;
    startPathY: number;
    endPathX: number;
    endPathY: number;
    path: PathStep[];
}

export const PatchPlayerControls: IPatcher = (
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
) => {
    const _ArrowData = patchLoader.getDefinition<typeof ArrowData>('ArrowData');
    let isRightMouseDown = false;

    document.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.button === 2) {
            e.preventDefault();
            isRightMouseDown = true;
        }
    });

    document.addEventListener('mouseup', (e: MouseEvent) => {
        if (e.button === 2) {
            e.preventDefault();
            isRightMouseDown = false;
        }
    });

    document.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    patchLoader.addDefinitionPatch(
        'PlayerControls',
        (_module: typeof PlayerControls) => {
            return class PlayerControls extends _module {
                private pathData: PathData | null = null;

                public constructor(
                    cnv: HTMLCanvasElement,
                    game: Game,
                    playerUI: PlayerUI,
                    history?: GameHistory | null,
                ) {
                    super(cnv, game, playerUI, history);

                    const _this = this as any as PrivatePlayerControls;

                    const oldLeftClickCallback =
                        _this.mouseHandler.leftClickCallback;

                    _this.mouseHandler.leftClickCallback = () => {
                        oldLeftClickCallback();
                        const arrow: Arrow | undefined =
                            _this.getArrowByMousePosition();
                        const shiftPressed: boolean =
                            _this.keyboardHandler.getShiftPressed();
                        const freeCursor: boolean =
                            _this.arrowActions.isFreeCursor();

                        if (
                            arrow !== undefined &&
                            freeCursor &&
                            !shiftPressed
                        ) {
                            if (arrow.type === 21 || arrow.type === 24) {
                                if (arrow.astIndex != null) {
                                    const engine =
                                        _this.game.gameMap.graph.engine;
                                    const state = arrow.signal !== 0;
                                    engine.doPressButton(arrow.astIndex, state);
                                }
                            }
                        }
                    };

                    const oldKeyDownCallback = _this.keyboardHandler.onKeyDown;
                    _this.keyboardHandler.onKeyDown = (
                        code: string,
                        key: string,
                    ) => {
                        if (
                            _this.playerUI.speedController?.customTPSField?.isFocused()
                        ) {
                            if (
                                code === 'Enter' ||
                                code === 'NumpadEnter' ||
                                code === 'Escape'
                            ) {
                                _this.playerUI.speedController?.customTPSField?.blur();
                            }
                            return;
                        }
                        if (code === 'KeyP') {
                            const arrow = _this.getArrowByMousePosition();
                            if (
                                arrow?.astIndex === undefined ||
                                arrow.astIndex == null
                            )
                                return;
                            const engine = _this.game.gameMap.graph.engine;
                            const node = _this.game.gameMap.graph.getNode(
                                arrow.astIndex,
                            );
                            if (!node.isCycle) {
                                const signal = engine.getNodeSignal(
                                    arrow.astIndex,
                                );
                                const state = signal === NodeSignal.NONE;
                                engine.doArrowSignal(arrow.astIndex, state);
                                return;
                            }
                        }
                        if (
                            _this.keyboardHandler.getShiftPressed() &&
                            code === 'Enter'
                        ) {
                            const engine = _this.game.gameMap.graph.engine;
                            engine.rewindToTick(
                                Math.max(engine.getTick() - 1, 0),
                            );
                            _this.playerUI.updateFpsDisplay();
                            return;
                        }
                        if (oldKeyDownCallback) oldKeyDownCallback(code, key);
                    };

                    const oldKeyUpCallback = _this.keyboardHandler.onKeyUp;
                    _this.keyboardHandler.onKeyUp = (code: string) => {
                        if (code === 'KeyE') {
                            _this.arrowActions.hideSelectionTip();
                        }
                        if (oldKeyUpCallback) oldKeyUpCallback(code);
                    };
                }

                public update(): void {
                    super.update();

                    const _this = this as any as PrivatePlayerControls;

                    _this.game.customTPS =
                        _this.playerUI.speedController?.customTPSField.tps || 1;

                    const taskKey = 'player-drag-path';

                    if (isRightMouseDown) {
                        const [x, y] = _this.getPositionByMousePosition();

                        if (this.pathData === null) {
                            this.pathData = {
                                startPathX: x,
                                startPathY: y,
                                endPathX: x,
                                endPathY: y,
                                path: [],
                            };
                        }

                        if (
                            this.pathData &&
                            (this.pathData.endPathX !== x ||
                                this.pathData.endPathY !== y)
                        ) {
                            this.pathData.endPathX = x;
                            this.pathData.endPathY = y;

                            graphDLC.pathFinder.cancelPathSearch(taskKey);

                            graphDLC.pathFinder.findPathAsync(
                                taskKey,
                                _this.game.gameMap,
                                this.pathData.startPathX,
                                this.pathData.startPathY,
                                this.pathData.endPathX,
                                this.pathData.endPathY,
                                (newPath) => {
                                    if (this.pathData) {
                                        this.pathData.path = newPath ?? [];
                                        _this.game.path = this.pathData.path;
                                    }
                                },
                            );
                        }
                    } else {
                        if (this.pathData) {
                            graphDLC.pathFinder.forceCompletePath(taskKey);

                            this.pathData.path.forEach(
                                ({ x, y, type, rotation, flipped }) => {
                                    const arrowOld = _ArrowData.def.fromArrow(
                                        _this.game.gameMap.getArrow(x, y),
                                    );
                                    const arrowNew = _ArrowData.def.fromState(
                                        type,
                                        rotation,
                                        flipped,
                                    );
                                    if (_this.history !== null) {
                                        _this.history.addChange(
                                            x,
                                            y,
                                            arrowOld,
                                            arrowNew,
                                        );
                                    }
                                    _this.game.gameMap.setArrowType(x, y, type);
                                    _this.game.gameMap.setArrowRotation(
                                        x,
                                        y,
                                        rotation,
                                    );
                                    _this.game.gameMap.setArrowFlipped(
                                        x,
                                        y,
                                        flipped,
                                    );
                                },
                            );
                        }
                        this.pathData = null;
                        _this.game.path = null;
                    }
                }
            };
        },
    );
};
