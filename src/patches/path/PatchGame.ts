import { CELL_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { PathStep } from 'src/core/path_finder/types';
import type { IPatcher } from '../Patcher';

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
            public path: PathStep[] | null = null;

            private getDrawOffsets(): { offsetX: number; offsetY: number } {
                const alignCorrection = 0.025 * this.scale;
                return {
                    offsetX:
                        (this.offset[0] * this.scale) / CELL_SIZE +
                        alignCorrection,
                    offsetY:
                        (this.offset[1] * this.scale) / CELL_SIZE +
                        alignCorrection,
                };
            }

            private drawPath(
                render: GameRender,
                offsetX: number,
                offsetY: number,
            ) {
                if (!this.path) return;

                render.setSolidColor(0.2, 0.2, 0.8, 0.25);
                this.path.forEach(({ x, y }) => {
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

                this.path.forEach(({ x, y, type, rotation, flipped }) => {
                    render.drawArrow(
                        x * this.scale + offsetX,
                        y * this.scale + offsetY,
                        type,
                        0,
                        rotation,
                        flipped,
                    );
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
