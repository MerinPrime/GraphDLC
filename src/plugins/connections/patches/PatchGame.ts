import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import { NodeType } from 'src/core/graph/engines/core/NodeType';
import type { PatchLoader } from 'src/core/PatchLoader';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
import { EnableArrowRelationsSetting } from '../../connections/settings/EnableArrowRelationsSetting';
import { ShowArrowConnectionsSetting } from '../../connections/settings/ShowArrowConnectionsSetting';
import type { IPatcher } from '../../Patcher';

interface PrivateGame {
    gameMap: GameMap;
    readonly render: GameRender;
}

export const PatchGame: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('Game', (_module: typeof Game) => {
        return class Game extends _module {
            private drawPastedArrowRelations(
                render: GameRender,
                offsetX: number,
                offsetY: number,
            ): boolean {
                if (
                    !EnableArrowRelationsSetting.value ||
                    !this.drawPastedArrows
                ) {
                    return false;
                }

                const copiedArrows = [
                    ...this.selectedMap.getCopiedArrows().values(),
                ];
                if (copiedArrows.length !== 1) return false;

                const arrow = copiedArrows[0];
                render.setSolidColor(0.2, 0.8, 0.2, 0.25);

                getArrowRelations(arrow.type).forEach(([relX, relY]) => {
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
                        this.scale,
                        this.scale,
                    );
                });

                return true;
            }

            private drawArrowConnections(
                render: GameRender,
                gameMap: GameMap,
                arrowAtCursor: Arrow,
                offsetX: number,
                offsetY: number,
                highlightNextColor: boolean,
            ) {
                if (
                    !ShowArrowConnectionsSetting.value ||
                    arrowAtCursor.astIndex == null
                )
                    return;

                const astNode = gameMap.graph.getNode(arrowAtCursor.astIndex);
                const isEmpty = arrowAtCursor.type === 0;

                render.setSolidColor(0.8, 0.2, 0.2, 0.25);
                astNode.backLinks.forEach((previousNode) => {
                    if (
                        astNode.type === NodeType.DETECTOR &&
                        previousNode.type !== NodeType.BLOCKER &&
                        astNode.detectedLink !== previousNode
                    )
                        return;
                    render.drawSolidColorRect(
                        previousNode.globalX * this.scale + offsetX,
                        previousNode.globalY * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                });

                const nextColor = highlightNextColor
                    ? [0.8, 0.8, 0.2, 0.25]
                    : [0.2, 0.8, 0.2, 0.25];
                render.setSolidColor(
                    nextColor[0],
                    nextColor[1],
                    nextColor[2],
                    nextColor[3],
                );

                astNode.links.forEach((linkedNode) => {
                    if (
                        linkedNode.type === NodeType.DETECTOR &&
                        linkedNode.detectedLink !== astNode
                    )
                        return;
                    render.drawSolidColorRect(
                        linkedNode.globalX * this.scale + offsetX,
                        linkedNode.globalY * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                });

                if (!isEmpty) {
                    render.setSolidColor(0.2, 0.2, 0.8, 0.25);
                    render.drawSolidColorRect(
                        astNode.globalX * this.scale + offsetX,
                        astNode.globalY * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                }
            }

            public draw() {
                super.draw();

                const { render, gameMap } = this as any as PrivateGame;

                const { offsetX, offsetY } = this.getDrawOffsets();

                render.setShowBorder(false);
                const hasPastedArrow = this.drawPastedArrowRelations(
                    render,
                    offsetX,
                    offsetY,
                );

                const arrowAtCursor = this.getArrowAtCursor();
                if (arrowAtCursor) {
                    this.drawArrowConnections(
                        render,
                        gameMap,
                        arrowAtCursor,
                        offsetX,
                        offsetY,
                        hasPastedArrow,
                    );
                }
                render.setShowBorder(true);
            }
        };
    });
};
