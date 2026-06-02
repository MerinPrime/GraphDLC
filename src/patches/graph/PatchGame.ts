import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { CELL_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { EnableArrowRelationsSetting } from 'src/core/settings/instances/other/EnableArrowRelationsSetting';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';

interface PrivateGame {
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
                        getArrowRelations(arrow.type).forEach(([x, y]) => {
                            if (arrow.flipped) y = -y;
                            let bx = this.mousePosition[0];
                            let by = this.mousePosition[1];
                            switch (arrow.rotation) {
                                case 0:
                                    by += x;
                                    bx += y;
                                    break;
                                case 1:
                                    bx -= x;
                                    by += y;
                                    break;
                                case 2:
                                    by -= x;
                                    bx -= y;
                                    break;
                                case 3:
                                    bx += x;
                                    by -= y;
                                    break;
                            }
                            render.drawSolidColorRect(
                                bx * this.scale + offsetX,
                                by * this.scale + offsetY,
                                scale,
                                scale,
                            );
                        });
                        selectedArrowDrawn = true;
                    }

                    render.setShowBorder(true);
                }
                // if (!selectedArrowDrawn && settings.data.showArrowConnections && graphDLC.rootNode) {
                //     if (arrowAtCursor) {
                //         const astNode = graphDLC.rootNode.astNodes.get(arrowAtCursor);
                //         if (astNode) {
                //             this.render.setSolidColor(0.0, 1.0, 0.0, 0.25);
                //             astNode.allEdges.forEach((edge: ASTNode) => {
                //                 edge.arrows.forEach((ar) => {
                //                     if (ar.x === undefined || ar.y === undefined) return;
                //                     this.render.drawSolidColor(ar.x * scale + offsetX, ar.y * scale + offsetY, scale, scale);
                //                 });
                //             })
                //             this.render.setSolidColor(1.0, 0.0, 0.0, 0.25);
                //             astNode.backEdges.forEach((edge: ASTNode) => {
                //                 edge.arrows.forEach((ar) => {
                //                     if (ar.x === undefined || ar.y === undefined) return;
                //                     this.render.drawSolidColor(ar.x * scale + offsetX, ar.y * scale + offsetY, scale, scale);
                //                 });
                //             });
                //             this.render.setSolidColor(0.0, 0.0, 1.0, 0.25);
                //             astNode.arrows.forEach((ar: Arrow) => {
                //                 if (ar.x === undefined || ar.y === undefined) return;
                //                 this.render.drawSolidColor(ar.x * scale + offsetX, ar.y * scale + offsetY, scale, scale);
                //             });
                //         } else if (arrowAtCursor.type !== ArrowType.EMPTY) {
                //             const cycleID = arrowAtCursor.cycleID;
                //             if (cycleID !== undefined) {
                //                 const cycle = graphDLC.rootNode.cycles[cycleID];
                //                 if (cycle !== undefined) {
                //                     this.render.setSolidColor(0.0, 0.5, 0.5, 0.25);
                //                     for (let i = 0; i < cycle.length; i++) {
                //                         const arrow = cycle.cycle[i];
                //                         this.render.drawSolidColor(arrow.x! * scale + offsetX, arrow.y! * scale + offsetY, scale, scale);
                //                     }
                //                 }
                //             } else {
                //                 this.render.setSolidColor(0.0, 0.0, 0.0, 0.25);
                //                 if (arrowAtCursor.x === undefined || arrowAtCursor.y === undefined) return;
                //                 this.render.drawSolidColor(arrowAtCursor.x * scale + offsetX, arrowAtCursor.y * scale + offsetY, scale, scale);
                //             }
                //         }
                //         this.screenUpdated = true;
                //     }
                // }
                // this.render.disableSolidColor();
            }
        };
    });
}
