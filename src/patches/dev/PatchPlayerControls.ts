import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { ArrowData } from '@logic-arrows/game-logic/arrow-data';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { PathStep } from 'src/core/path_finder/PathFinder';

interface PrivatePlayerControls {
    game: Game;
    playerUI: PlayerUI;
    keyboardHandler: KeyboardHandler;
    history: GameHistory | null;

    getPositionByMousePosition(): [x: number, y: number];
}

export function PatchPlayerControls(
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
) {
    const _ArrowData = patchLoader.getDefinition<typeof ArrowData>('ArrowData');

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

                    const keyboardHandler = _this.keyboardHandler;
                    if (keyboardHandler.getKeyPressed('KeyT')) {
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
