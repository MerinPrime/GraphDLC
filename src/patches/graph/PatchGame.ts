import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { CELL_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { RawCycle } from 'src/core/graph/raw/RawNode';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { PathStep } from 'src/core/path_finder/PathFinder';
import { EnableArrowRelationsSetting } from 'src/core/settings/instances/other/EnableArrowRelationsSetting';
import { EnableBreakpointSetting } from 'src/core/settings/instances/other/EnableBreakpointSetting';
import { ShowArrowConnectionsSetting } from 'src/core/settings/instances/other/ShowArrowConnectionsSetting';
import { ArrowType } from 'src/core/utils/ArrowType';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';

interface PrivateGame {
    readonly gameMap: GameMap;
    render: GameRender;
}

export function PatchGame(patchLoader: PatchLoader, graphDLC: GraphDLC) {
    patchLoader.addDefinitionPatch('Game', (_module: typeof Game) => {
        return class Game extends _module {
            public path: PathStep[] | null = null;

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
                        if (
                            astNode.arrow.type === ArrowType.DETECTOR &&
                            astNode.detectedNode !== previousNode
                        )
                            return;
                        render.drawSolidColorRect(
                            previousNode.globalX * scale + offsetX,
                            previousNode.globalY * scale + offsetY,
                            scale,
                            scale,
                        );
                    });
                    if (selectedArrowDrawn)
                        render.setSolidColor(0.8, 0.8, 0.2, 0.25);
                    else render.setSolidColor(0.2, 0.8, 0.2, 0.25);
                    astNode.next.forEach((nextNode) => {
                        if (
                            nextNode.arrow.type === ArrowType.DETECTOR &&
                            nextNode.detectedNode !== astNode
                        )
                            return;
                        render.drawSolidColorRect(
                            nextNode.globalX * scale + offsetX,
                            nextNode.globalY * scale + offsetY,
                            scale,
                            scale,
                        );
                    });
                    if (!isEmpty) {
                        render.setSolidColor(0.2, 0.2, 0.8, 0.25);
                        render.drawSolidColorRect(
                            astNode.globalX * scale + offsetX,
                            astNode.globalY * scale + offsetY,
                            scale,
                            scale,
                        );
                    }
                }

                render.startTransparentArrowsRendering();
                render.setArrowSize(this.scale);
                render.setArrowAlpha(0.5);
                this.path?.forEach(({ x, y, type, rotation, flipped }) => {
                    render.drawArrow(
                        x * scale + offsetX,
                        y * scale + offsetY,
                        type,
                        0,
                        rotation,
                        flipped,
                    );
                });
                this.path?.forEach(({ x, y }) => {
                    render.setSolidColor(0.2, 0.2, 0.8, 0.25);
                    render.drawSolidColorRect(
                        x * scale + offsetX,
                        y * scale + offsetY,
                        scale,
                        scale,
                    );
                });
                // TODO: Another setting or debug mode
                if (EnableBreakpointSetting.value) {
                    const cycles = new Set<RawCycle>();
                    gameMap.rawGraph.nodes.forEach((node) => {
                        if (!node.cycleRef) return;
                        cycles.add(node.cycleRef);
                    });
                    cycles.forEach((cycle) => {
                        cycle.nodes.forEach((node) => {
                            render.setSolidColor(0.8, 0.2, 0.8, 0.25);
                            render.drawSolidColorRect(
                                node.globalX * scale + offsetX,
                                node.globalY * scale + offsetY,
                                scale,
                                scale,
                            );
                        });
                        cycle.read.forEach((node) => {
                            render.setSolidColor(0.2, 0.2, 0.8, 0.25);
                            render.drawSolidColorRect(
                                node.globalX * scale + offsetX,
                                node.globalY * scale + offsetY,
                                scale,
                                scale,
                            );
                        });
                        cycle.clear.forEach((node) => {
                            render.setSolidColor(0.8, 0.2, 0.2, 0.25);
                            render.drawSolidColorRect(
                                node.globalX * scale + offsetX,
                                node.globalY * scale + offsetY,
                                scale,
                                scale,
                            );
                        });
                        cycle.write.forEach((node) => {
                            render.setSolidColor(0.2, 0.8, 0.2, 0.25);
                            render.drawSolidColorRect(
                                node.globalX * scale + offsetX,
                                node.globalY * scale + offsetY,
                                scale,
                                scale,
                            );
                        });
                        cycle.xor_write.forEach((node) => {
                            render.setSolidColor(0.8, 0.8, 0.2, 0.25);
                            render.drawSolidColorRect(
                                node.globalX * scale + offsetX,
                                node.globalY * scale + offsetY,
                                scale,
                                scale,
                            );
                        });
                    });
                }

                render.setShowBorder(true);
            }
        };
    });
}
