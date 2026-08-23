import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { ArrowType } from 'src/core/utils/ArrowType';
import type { IPatcher } from '../../Patcher';
import type { PathData } from './types';

interface PrivateGame {
    gameMap: GameMap;
    readonly render: GameRender;

    updateTime: number;
    tps: number;
    tick: number;
    updatesPerSecond: number;
}

export const PatchGame: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('Game', (_module: typeof Game) => {
        return class Game extends _module {
            public pathData: PathData | null = null;

            private drawPath(
                render: GameRender,
                offsetX: number,
                offsetY: number,
            ) {
                const pathData = this.pathData;
                if (!pathData) return;

                render.setSolidColor(0.2, 0.2, 0.8, 0.25);
                pathData.path.forEach(({ x, y }) => {
                    render.drawSolidColorRect(
                        x * this.scale + offsetX,
                        y * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                });

                render.startTransparentArrowsRendering();
                render.setArrowSize(this.scale);
                render.setArrowAlpha(0.5);

                const isLinearPath = pathData.arrowType !== (-1 as ArrowType);

                pathData.path.forEach(({ x, y, type, rotation, flipped }) => {
                    if (isLinearPath) {
                        render.drawArrow(
                            x * this.scale + offsetX,
                            y * this.scale + offsetY,
                            type,
                            0,
                            pathData.rotation,
                            pathData.flip,
                        );
                    } else {
                        render.drawArrow(
                            x * this.scale + offsetX,
                            y * this.scale + offsetY,
                            type,
                            0,
                            rotation,
                            flipped,
                        );
                    }
                });
            }

            public draw() {
                super.draw();

                const { render } = this as any as PrivateGame;
                const { offsetX, offsetY } = this.getDrawOffsets();

                render.setShowBorder(false);
                this.drawPath(render, offsetX, offsetY);
                render.setShowBorder(true);
            }
        };
    });
};
