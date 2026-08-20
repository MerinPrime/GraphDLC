import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { CELL_SIZE, CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import { NodeSignal } from 'src/core/graph/engines/core/NodeSignal';
import { NodeType } from 'src/core/graph/engines/core/NodeType';
import type { PatchLoader } from 'src/core/PatchLoader';
import { ACTIVE_SIGNALS, ArrowSignal } from 'src/core/utils/ArrowSignal';
import { ArrowType } from 'src/core/utils/ArrowType';
import { Bounds } from 'src/core/utils/Bounds';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
import type { IPatcher } from '../../Patcher';
import { EnableArrowRelationsSetting } from '../settings/tools/EnableArrowRelationsSetting';
import { ShowArrowConnectionsSetting } from '../settings/tools/ShowArrowConnectionsSetting';

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
            public constructor(canvas: HTMLCanvasElement) {
                super(canvas);
                const _this = this as any as PrivateGame;
                _this.gameMap.isMain = location.pathname.startsWith('/map');
            }

            public getArrowAtCursor(): Arrow | undefined {
                return this.gameMap.getArrow(
                    this.mousePosition[0],
                    this.mousePosition[1],
                );
            }

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

            private getViewportBounds(): Bounds {
                const minX =
                    Math.floor(-this.offset[0] / CELL_SIZE / CHUNK_SIZE) - 1;
                const minY =
                    Math.floor(-this.offset[1] / CELL_SIZE / CHUNK_SIZE) - 1;
                const maxX =
                    Math.floor(
                        -this.offset[0] / CELL_SIZE / CHUNK_SIZE +
                            this.width / this.scale / CHUNK_SIZE,
                    ) + CHUNK_SIZE;
                const maxY =
                    Math.floor(
                        -this.offset[1] / CELL_SIZE / CHUNK_SIZE +
                            this.height / this.scale / CHUNK_SIZE,
                    ) + CHUNK_SIZE;

                return new Bounds(
                    minX * CHUNK_SIZE,
                    minY * CHUNK_SIZE,
                    maxX * CHUNK_SIZE,
                    maxY * CHUNK_SIZE,
                );
            }

            public draw() {
                const graph = this.gameMap.graph;
                const engine = graph.engine;

                const bounds = this.getViewportBounds();

                graph.markCyclesChunksDirty();

                const dirtyChunksIdx = engine.getDirtyChunks(false);
                dirtyChunksIdx.forEach((dirtyChunkIdx) => {
                    const chunk = graph.getChunkByIdx(dirtyChunkIdx);
                    if (
                        !bounds.InBounds(
                            chunk.x * CHUNK_SIZE,
                            chunk.y * CHUNK_SIZE,
                        )
                    )
                        return;
                    chunk.getArrows().forEach((arrow) => {
                        if (
                            arrow.astIndex == null ||
                            arrow.type === ArrowType.EMPTY
                        ) {
                            arrow.signal = ArrowSignal.NONE;
                            return;
                        }
                        const signal = engine.getNodeSignal(arrow.astIndex);
                        if (signal === NodeSignal.ACTIVE)
                            arrow.signal = ACTIVE_SIGNALS[arrow.type];
                        else if (signal === NodeSignal.PENDING)
                            arrow.signal = ArrowSignal.BLUE;
                        else arrow.signal = ArrowSignal.NONE;
                    });
                    engine.makeUndirtyChunk(dirtyChunkIdx);
                    chunk.markRenderDirty();
                });

                super.draw();

                const { render, gameMap } = this as any as PrivateGame;
                render.setShowBorder(false);

                const { offsetX, offsetY } = this.getDrawOffsets();
                const arrowAtCursor = this.getArrowAtCursor();

                const hasPastedArrow = this.drawPastedArrowRelations(
                    render,
                    offsetX,
                    offsetY,
                );

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

                graph.debugger.render(bounds, (x, y, [r, g, b, a]) => {
                    render.setSolidColor(r, g, b, a);
                    render.drawSolidColorRect(
                        x * this.scale + offsetX,
                        y * this.scale + offsetY,
                        this.scale,
                        this.scale,
                    );
                });

                render.setShowBorder(true);
            }
        };
    });
};
