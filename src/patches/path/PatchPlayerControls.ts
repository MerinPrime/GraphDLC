import type { ArrowData } from '@logic-arrows/game-logic/arrow-data';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { PathStep } from 'src/core/path_finder/types';
import type { IPatcher } from '../Patcher';

interface PrivatePlayerControls {
    readonly game: Game;
    readonly history: GameHistory | null;

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

                public update(): void {
                    super.update();

                    const _this = this as any as PrivatePlayerControls;

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
