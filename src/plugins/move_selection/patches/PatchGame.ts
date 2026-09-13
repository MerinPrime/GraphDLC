import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { ArrowSignal } from 'src/core/utils/ArrowSignal';
import type { IPatcher } from '../../Patcher';
import type { RenderMoveContext } from './types';

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
            public renderMoveContext: RenderMoveContext | null = null;

            public draw() {
                if (this.renderMoveContext) {
                    this.screenUpdated = true;
                }

                super.draw();

                const { render } = this as any as PrivateGame;
                const { offsetX, offsetY } = this.getDrawOffsets();

                this.clearAllArrows(render, offsetX, offsetY);
                this.clearSelectionArrows(render, offsetX, offsetY);
            }

            public clearAllArrows(
                render: GameRender,
                offsetX: number,
                offsetY: number,
            ) {
                if (!this.renderMoveContext) return;
                for (const arrow of this.renderMoveContext.initArrows) {
                    render.clearArrow(
                        arrow.x * this.scale + offsetX,
                        arrow.y * this.scale + offsetY,
                        this.scale,
                    );
                }
                for (const arrow of this.renderMoveContext.selection) {
                    render.clearArrow(
                        arrow.x * this.scale + offsetX,
                        arrow.y * this.scale + offsetY,
                        this.scale,
                    );
                }
            }

            public clearSelectionArrows(
                render: GameRender,
                offsetX: number,
                offsetY: number,
            ) {
                if (!this.renderMoveContext) return;
                render.startTransparentArrowsRendering();
                render.setArrowSize(this.scale);
                render.setArrowAlpha(1);
                for (const arrow of this.renderMoveContext.selection) {
                    render.drawArrow(
                        arrow.x * this.scale + offsetX,
                        arrow.y * this.scale + offsetY,
                        arrow.data.type,
                        ArrowSignal.NONE,
                        arrow.data.rotation,
                        arrow.data.flipped,
                    );
                }
                render.setSolidColor(0.25, 0.5, 1.0, 0.25);
                for (const arrow of this.renderMoveContext.selection) {
                    const s = this.scale * 0.05;
                    render.drawSolidColorRect(
                        arrow.x * this.scale + offsetX - s / 2,
                        arrow.y * this.scale + offsetY - s / 2,
                        this.scale + s,
                        this.scale + s,
                    );
                }
            }
        };
    });
};
