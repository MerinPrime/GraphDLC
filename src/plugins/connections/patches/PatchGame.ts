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
import { GraphVisualizerSetting } from '../../connections/settings/GraphVisualizerSetting';
import { ShowArrowConnectionsSetting } from '../../connections/settings/ShowArrowConnectionsSetting';
import type { IPatcher } from '../../Patcher';
import {
    BRANCH_COLOR,
    GraphRenderHelper,
    INPUT_COLOR,
    OUTPUT_COLOR,
    PATH_COLOR,
    SAME_TIMING_COLOR,
} from './GraphRenderHelper';
import type { HighlightPathData } from './types';

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
            public highlightPathData: HighlightPathData | null = null;
            private graphRenderer = new GraphRenderHelper();

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
                if (!astNode) return;

                const isEmpty = arrowAtCursor.type === 0;
                let hasConnections = false;

                render.setSolidColor(0.8, 0.2, 0.2, 0.25);
                astNode.backLinks.forEach((previousNode) => {
                    if (
                        astNode.type === NodeType.DETECTOR &&
                        previousNode.type !== NodeType.BLOCKER &&
                        astNode.detectedLink !== previousNode
                    )
                        return;
                    hasConnections = true;
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
                    hasConnections = true;
                    render.drawSolidColorRect(
                        linkedNode.globalX * this.scale + offsetX,
                        linkedNode.globalY * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                });

                if (!isEmpty || hasConnections) {
                    render.setSolidColor(0.2, 0.2, 0.8, 0.25);
                    render.drawSolidColorRect(
                        astNode.globalX * this.scale + offsetX,
                        astNode.globalY * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                }
            }

            private drawArrowPath(
                render: GameRender,
                gameMap: GameMap,
                offsetX: number,
                offsetY: number,
            ) {
                if (this.highlightPathData === null) return;

                if (GraphVisualizerSetting.value) {
                    this.graphRenderer.renderPath(
                        render,
                        gameMap,
                        this.highlightPathData,
                        offsetX,
                        offsetY,
                        this.scale,
                    );
                    return;
                }

                render.setSolidColor(
                    PATH_COLOR[0],
                    PATH_COLOR[1],
                    PATH_COLOR[2],
                    PATH_COLOR[3],
                );
                this.highlightPathData.path.forEach((node) => {
                    render.drawSolidColorRect(
                        node.globalX * this.scale + offsetX,
                        node.globalY * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                });

                render.setSolidColor(
                    BRANCH_COLOR[0],
                    BRANCH_COLOR[1],
                    BRANCH_COLOR[2],
                    BRANCH_COLOR[3],
                );
                this.highlightPathData.branches.forEach((node) => {
                    render.drawSolidColorRect(
                        node.globalX * this.scale + offsetX,
                        node.globalY * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                });

                render.setSolidColor(
                    SAME_TIMING_COLOR[0],
                    SAME_TIMING_COLOR[1],
                    SAME_TIMING_COLOR[2],
                    SAME_TIMING_COLOR[3],
                );
                this.highlightPathData.sameNodes.forEach((node) => {
                    render.drawSolidColorRect(
                        node.globalX * this.scale + offsetX,
                        node.globalY * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                });

                render.setSolidColor(
                    OUTPUT_COLOR[0],
                    OUTPUT_COLOR[1],
                    OUTPUT_COLOR[2],
                    OUTPUT_COLOR[3],
                );
                this.highlightPathData.output.forEach((node) => {
                    render.drawSolidColorRect(
                        node.globalX * this.scale + offsetX,
                        node.globalY * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                });

                render.setSolidColor(
                    INPUT_COLOR[0],
                    INPUT_COLOR[1],
                    INPUT_COLOR[2],
                    INPUT_COLOR[3],
                );
                this.highlightPathData.input.forEach((node) => {
                    render.drawSolidColorRect(
                        node.globalX * this.scale + offsetX,
                        node.globalY * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                });
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

                if (this.highlightPathData !== null) {
                    this.drawArrowPath(render, gameMap, offsetX, offsetY);
                } else if (!this.isSelectionMoving) {
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
                }

                render.setShowBorder(true);
            }
        };
    });
};
