import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { CELL_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { EnableArrowRelationsSetting } from 'src/core/settings/instances/other/EnableArrowRelationsSetting';
import { ShowArrowConnectionsSetting } from 'src/core/settings/instances/other/ShowArrowConnectionsSetting';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';

interface PrivateGame {
    readonly gameMap: GameMap;
    render: GameRender;
}

export function PatchGame(patchLoader: PatchLoader, graphDLC: GraphDLC) {
    patchLoader.addDefinitionPatch('Game', (_module: typeof Game) => {
        return class Game extends _module {
            public getArrowAtCursor(): Arrow | undefined {
                const arrowAtCursor = this.gameMap.getArrow(
                    this.mousePosition[0],
                    this.mousePosition[1],
                );
                return arrowAtCursor;
            }

            draw() {
                super.draw();

                const render = (this as any as PrivateGame).render;
                const gameMap = (this as any as PrivateGame).gameMap;

                render.setShowBorder(false);

                const offsetX =
                    (this.offset[0] * this.scale) / CELL_SIZE +
                    0.025 * this.scale;
                const offsetY =
                    (this.offset[1] * this.scale) / CELL_SIZE +
                    0.025 * this.scale;
                const arrowAtCursor = this.gameMap.getArrow(
                    this.mousePosition[0],
                    this.mousePosition[1],
                );
                const scale = this.scale;
                let selectedArrowDrawn = false;
                if (
                    EnableArrowRelationsSetting.value &&
                    this.drawPastedArrows
                ) {
                    const copiedArrows = [
                        ...this.selectedMap.getCopiedArrows().values(),
                    ];
                    if (copiedArrows.length === 1) {
                        render.setSolidColor(0.2, 0.8, 0.2, 0.25);
                        const arrow = copiedArrows[0];
                        getArrowRelations(arrow.type).forEach(
                            ([relX, relY]) => {
                                const { x, y } = getRelativePosition(
                                    this.mousePosition[0],
                                    this.mousePosition[1],
                                    arrow.rotation,
                                    arrow.flipped,
                                    relX,
                                    relY,
                                );
                                render.drawSolidColorRect(
                                    x * this.scale + offsetX,
                                    y * this.scale + offsetY,
                                    scale,
                                    scale,
                                );
                            },
                        );
                        selectedArrowDrawn = true;
                    }
                }
                if (
                    ShowArrowConnectionsSetting.value &&
                    arrowAtCursor &&
                    arrowAtCursor.graphAstIndex
                ) {
                    const astNode = gameMap.rawGraph.getNode(
                        arrowAtCursor.graphAstIndex,
                    );
                    const isEmpty = arrowAtCursor.type === 0;
                    render.setSolidColor(0.8, 0.2, 0.2, 0.25);
                    astNode.previous.forEach((previousNode) => {
                        render.drawSolidColorRect(
                            previousNode.globalX * scale + offsetX,
                            previousNode.globalY * scale + offsetY,
                            scale,
                            scale,
                        );
                    });
                    if (!isEmpty) {
                        if (selectedArrowDrawn)
                            render.setSolidColor(0.8, 0.8, 0.2, 0.25);
                        else render.setSolidColor(0.2, 0.8, 0.2, 0.25);
                        astNode.next.forEach((previousNode) => {
                            render.drawSolidColorRect(
                                previousNode.globalX * scale + offsetX,
                                previousNode.globalY * scale + offsetY,
                                scale,
                                scale,
                            );
                        });
                        render.setSolidColor(0.2, 0.2, 0.8, 0.25);
                        render.drawSolidColorRect(
                            astNode.globalX * scale + offsetX,
                            astNode.globalY * scale + offsetY,
                            scale,
                            scale,
                        );
                    }
                }

                render.setShowBorder(true);
            }
        };
    });
}
