import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { MouseHandler } from '@logic-arrows/controls/mouse-handler';
import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { ArrowData } from '@logic-arrows/game-logic/arrow-data';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerArrowActions } from '@logic-arrows/player/player-arrow-actions';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import { NodeSignal } from 'src/core/graph/raw/updater/NodeSignal';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { PathStep } from 'src/core/path_finder/PathFinder';

interface PrivatePlayerControls {
    game: Game;
    playerUI: PlayerUI;
    keyboardHandler: KeyboardHandler;
    history: GameHistory | null;
    mouseHandler: MouseHandler;
    arrowActions: PlayerArrowActions;

    getArrowByMousePosition(): Arrow | undefined;
    getPositionByMousePosition(): [x: number, y: number];
}

export function PatchPlayerControls(
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
) {
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
                private startPathX: number | null;
                private startPathY: number | null;
                private endPathX: number | null;
                private endPathY: number | null;
                private path: PathStep[] | null;

                constructor(
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
                                if (arrow.graphAstIndex != null) {
                                    const rawGraph =
                                        _this.game.gameMap.rawGraph;
                                    const astNode = rawGraph.getNode(
                                        arrow.graphAstIndex,
                                    );
                                    const astState =
                                        rawGraph.graphState.nodes[
                                            astNode.index
                                        ];
                                    astState.signal =
                                        arrow.signal !== 0
                                            ? NodeSignal.ACTIVE
                                            : NodeSignal.NONE;
                                    rawGraph.graphUpdater.markNodeAsChanged(
                                        rawGraph.graphState,
                                        astState,
                                    );
                                    rawGraph.graphState.changedNodes.push(
                                        astState,
                                    );
                                }
                                _this.game.screenUpdated = true;
                                const [x, y]: [number, number] =
                                    _this.getPositionByMousePosition();
                                const chunk: Chunk | undefined =
                                    _this.game.gameMap.getChunkByArrowCoordinates(
                                        x,
                                        y,
                                    );
                                if (chunk !== undefined) {
                                    chunk.setUpdated();
                                    chunk.markRenderDirty();
                                }
                            }
                        }
                    };
                    this.startPathX = null;
                    this.startPathY = null;
                    this.endPathX = null;
                    this.endPathY = null;
                    this.path = null;
                }

                public update(): void {
                    const _this = this as any as PrivatePlayerControls;

                    super.update();
                    _this.playerUI.updateDevDebugInfo();

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
                }
            };
        },
    );
}
