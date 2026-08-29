import type { ArrowData } from '@logic-arrows/game-logic/arrow-data';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerArrowActions } from '@logic-arrows/player/player-arrow-actions';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import type { PathData } from './types';

interface PrivatePlayerControls {
    readonly arrowActions: PlayerArrowActions;
    readonly game: Game;
    readonly history: GameHistory | null;

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
                private pathData: PathData | null = null;

                public update(): void {
                    super.update();

                    const _this = this as any as PrivatePlayerControls;

                    const taskKey = 'player-drag-path';
                    if (isRightMouseDown) {
                        const [x, y] = _this.getPositionByMousePosition();

                        const selectedArrow =
                            _this.arrowActions.getActiveArrowType();
                        const rotationState =
                            _this.game.selectedMap.getRotationState();
                        // @ts-expect-error
                        const flipState = _this.game.selectedMap.flipState;

                        if (this.pathData === null) {
                            this.pathData = {
                                startPathX: x,
                                startPathY: y,
                                endPathX: x,
                                endPathY: y,
                                path: [],
                                arrowType: selectedArrow,
                                rotation: rotationState,
                                flip: flipState,
                            };
                        }

                        this.pathData.rotation = rotationState;
                        this.pathData.flip = flipState;

                        if (
                            this.pathData &&
                            (this.pathData.endPathX !== x ||
                                this.pathData.endPathY !== y ||
                                this.pathData.arrowType !== selectedArrow)
                        ) {
                            this.pathData.endPathX = x;
                            this.pathData.endPathY = y;
                            this.pathData.arrowType = selectedArrow;

                            graphDLC.pathFinder.cancelPathSearch(taskKey);

                            if (selectedArrow === -1) {
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
                                            _this.game.pathData = this.pathData;
                                        }
                                    },
                                );
                            } else {
                                graphDLC.pathFinder.findLinearPathAsync(
                                    taskKey,
                                    _this.game.gameMap,
                                    this.pathData.startPathX,
                                    this.pathData.startPathY,
                                    this.pathData.endPathX,
                                    this.pathData.endPathY,
                                    selectedArrow,
                                    (newPath) => {
                                        if (this.pathData) {
                                            this.pathData.path = newPath ?? [];
                                            _this.game.pathData = this.pathData;
                                        }
                                    },
                                );
                            }
                        }
                    } else {
                        if (this.pathData) {
                            graphDLC.pathFinder.forceCompletePath(taskKey);

                            const gameMap = _this.game.gameMap;
                            this.pathData.path.forEach(
                                ({ x, y, type, rotation, flipped }) => {
                                    const arrowOld = _ArrowData.val.fromArrow(
                                        gameMap.getArrow(x, y),
                                    );
                                    const arrowNew = _ArrowData.val.fromState(
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
                                    const [chunk, arrow] =
                                        gameMap.getOrCreateArrow(x, y);
                                    arrow.type = type;
                                    arrow.rotation = rotation;
                                    arrow.flipped = flipped;
                                    gameMap.graph.updateArrowState(
                                        arrow,
                                        chunk,
                                        x,
                                        y,
                                    );
                                    chunk.markRenderDirty();
                                },
                            );
                        }
                        this.pathData = null;
                        _this.game.pathData = null;
                    }
                }
            };
        },
    );
};
