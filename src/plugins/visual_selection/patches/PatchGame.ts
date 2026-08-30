import { CELL_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

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
            public draw() {
                const _this = this as any as PrivateGame;
                const { render } = _this;

                const [oldSelectedArrows, oldSelection] = [
                    // @ts-expect-error
                    this.selectedMap.selectedArrows,
                    // @ts-expect-error
                    this.selectedMap.currentSelectedArrows,
                ];

                // @ts-expect-error
                this.selectedMap.selectedArrows = new Set();
                // @ts-expect-error
                this.selectedMap.currentSelectedArrows = new Set();

                super.draw();

                // @ts-expect-error
                this.selectedMap.selectedArrows = oldSelectedArrows;
                // @ts-expect-error
                this.selectedMap.currentSelectedArrows = oldSelection;

                render.setShowBorder(true);
                render.setFixedBorder(false);
                render.setSolidColor(0.25, 0.5, 1.0, 0.25);

                const alignCorrection = 0.05 * this.scale;

                const offsetX = (this.offset[0] * this.scale) / CELL_SIZE;
                const offsetY = (this.offset[1] * this.scale) / CELL_SIZE;

                this.selectedMap
                    .getSelectionForRender()
                    .forEach((selectedArrow) => {
                        render.setSides([
                            selectedArrow.left_side,
                            selectedArrow.top_side,
                            selectedArrow.right_side,
                            selectedArrow.bottom_side,
                        ]);
                        render.drawSolidColorRect(
                            selectedArrow.x * this.scale + offsetX,
                            selectedArrow.y * this.scale + offsetY,
                            this.scale + alignCorrection,
                            this.scale + alignCorrection,
                        );
                    });

                render.setFixedBorder(true);

                render.setSides([true, true, true, true]);
            }
        };
    });
};
