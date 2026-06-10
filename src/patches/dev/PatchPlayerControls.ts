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
                private startPathX: number | null = null;
                private startPathY: number | null = null;
                private endPathX: number | null = null;
                private endPathY: number | null = null;
                private path: PathStep[] | null = null;

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
                                        _this.game.gameMap.rawGraph.engine;
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
                            _this.keyboardHandler.getShiftPressed() &&
                            code === 'Enter'
                        ) {
                            const engine = _this.game.gameMap.rawGraph.engine;
                            engine.rewindToTick(
                                Math.max(engine.getTick() - 1, 0),
                            );
                            return;
                        }
                        if (oldKeyDownCallback) oldKeyDownCallback(code, key);
                    };
                }

                public update(): void {
                    super.update();

                    const _this = this as any as PrivatePlayerControls;

                    if (isRightMouseDown) {
                        const [x, y] = _this.getPositionByMousePosition();
                        if (
                            this.startPathX === null ||
                            this.startPathY === null
                        ) {
                            this.startPathX = x;
                            this.startPathY = y;
                        }
                        if (this.endPathX !== x || this.endPathY !== y) {
                            this.endPathX = x;
                            this.endPathY = y;
                            this.path = graphDLC.pathFinder.findPath(
                                _this.game.gameMap,
                                this.startPathX,
                                this.startPathY,
                                this.endPathX,
                                this.endPathY,
                            );
                            _this.game.path = this.path;
                        }
                    } else {
                        if (
                            this.startPathX !== null &&
                            this.startPathY !== null &&
                            this.endPathX !== null &&
                            this.endPathY !== null &&
                            this.path !== null
                        ) {
                            this.path.forEach(
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
                        this.startPathX = null;
                        this.startPathY = null;
                        this.endPathX = null;
                        this.endPathY = null;
                        this.path = null;
                        _this.game.path = null;
                    }
                    _this.playerUI.updateDevDebugInfo();
                }
            };
        },
    );
};
