import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { CELL_SIZE, CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { UIPauseSign } from '@logic-arrows/ui/components/ui-pause-sign';
import type { GraphDLC } from 'src/core/GraphDLC';
import { NodeSignal } from 'src/core/graph/core/NodeSignal';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { PathStep } from 'src/core/path_finder/types';
import { EnableArrowRelationsSetting } from 'src/core/settings/instances/other/EnableArrowRelationsSetting';
import { EnableBreakpointSetting } from 'src/core/settings/instances/other/EnableBreakpointSetting';
import { ShowArrowConnectionsSetting } from 'src/core/settings/instances/other/ShowArrowConnectionsSetting';
import { TargetFPSSetting } from 'src/core/settings/instances/other/TargetFPSSetting';
import { ACTIVE_SIGNALS, ArrowSignal } from 'src/core/utils/ArrowSignal';
import { ArrowType } from 'src/core/utils/ArrowType';
import { Bounds } from 'src/core/utils/Bounds';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
import type { IPatcher } from '../Patcher';

interface PrivateGame {
    readonly gameMap: GameMap;
    readonly render: GameRender;

    updateTime: number;
    tps: number;
    updatesPerSecond: number;
}

export const PatchGame: IPatcher = (
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
) => {
    let renderDelta = 0;
    let lastUpdateTime = -1;
    let accumulator = 0;
    let previousSpeed = 0;

    patchLoader.addDefinitionPatch('Game', (_module: typeof Game) => {
        return class Game extends _module {
            public path: PathStep[] | null = null;

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

                const astNode = gameMap.rawGraph.getNode(
                    arrowAtCursor.astIndex,
                );
                const isEmpty = arrowAtCursor.type === 0;

                render.setSolidColor(0.8, 0.2, 0.2, 0.25);
                astNode.previous.forEach((previousNode) => {
                    if (
                        astNode.type === ArrowType.DETECTOR &&
                        astNode.detectedNode !== previousNode
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

                astNode.next.forEach((nextNode) => {
                    if (
                        nextNode.type === ArrowType.DETECTOR &&
                        nextNode.detectedNode !== astNode
                    )
                        return;
                    render.drawSolidColorRect(
                        nextNode.globalX * this.scale + offsetX,
                        nextNode.globalY * this.scale + offsetY,
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

            private getViewportBounds(): Bounds {
                const minX =
                    Math.floor(-this.offset[0] / CELL_SIZE / CHUNK_SIZE) - 1;
                const minY =
                    Math.floor(-this.offset[1] / CELL_SIZE / CHUNK_SIZE) - 1;
                const maxX = Math.floor(
                    -this.offset[0] / CELL_SIZE / CHUNK_SIZE +
                        this.width / this.scale / CHUNK_SIZE,
                );
                const maxY = Math.floor(
                    -this.offset[1] / CELL_SIZE / CHUNK_SIZE +
                        this.height / this.scale / CHUNK_SIZE,
                );

                return new Bounds(
                    minX * CHUNK_SIZE,
                    minY * CHUNK_SIZE,
                    maxX * CHUNK_SIZE,
                    maxY * CHUNK_SIZE,
                );
            }

            public draw() {
                const renderStart = performance.now();

                const rawGraph = this.gameMap.rawGraph;
                const graphState = rawGraph.graphState;

                const bounds = this.getViewportBounds();

                rawGraph.cycles.forEach((cycle) => {
                    if (cycle === null) return;
                    cycle.nodes.forEach((node) => {
                        graphState.makeDirtyChunk(node.chunkIdx);
                    });
                });

                const dirtyChunksIdx = graphState.getDirtyChunks(false);
                dirtyChunksIdx.forEach((dirtyChunkIdx) => {
                    const chunk = rawGraph.getChunkByIdx(dirtyChunkIdx);
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
                        const signal = rawGraph.graphState.getNodeSignal(
                            arrow.astIndex,
                        );
                        if (signal === NodeSignal.ACTIVE)
                            arrow.signal = ACTIVE_SIGNALS[arrow.type];
                        else if (signal === NodeSignal.PENDING)
                            arrow.signal = ArrowSignal.BLUE;
                        else arrow.signal = ArrowSignal.NONE;
                    });
                    chunk.markRenderDirty();
                    graphState.makeUndirtyChunk(dirtyChunkIdx);
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

                this.drawPath(render, offsetX, offsetY);

                graphDLC.debugger.colorizeDebug(
                    gameMap.rawGraph,
                    bounds,
                    (node, r, g, b, a) => {
                        render.setSolidColor(r, g, b, a);
                        render.drawSolidColorRect(
                            node.globalX * this.scale + offsetX,
                            node.globalY * this.scale + offsetY,
                            this.scale,
                            this.scale,
                        );
                    },
                );

                render.setShowBorder(true);

                const renderEnd = performance.now();
                renderDelta = renderEnd - renderStart;
            }

            public updateFrame(e = () => {}) {
                const _this = this as any as PrivateGame;

                if (!this.playing) {
                    lastUpdateTime = -1;
                    return;
                }

                if (lastUpdateTime === -1) {
                    lastUpdateTime = performance.now();
                }

                const now = performance.now();
                const delta = now - lastUpdateTime;
                lastUpdateTime = now;
                accumulator += delta;

                const isMaxTPS = this.updateSpeedLevel === 8;
                // const isCustomTPS = this.updateSpeedLevel === 9;

                if (previousSpeed !== this.updateSpeedLevel) {
                    accumulator = 0;
                    previousSpeed = this.updateSpeedLevel;
                }

                const skip = [
                    1000 / 3,
                    1000 / 12,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                ][this.updateSpeedLevel];
                // const ticks = !isCustomTPS
                //     ? [1, 1, 1, 5, 20, 100, 500, 2000, 0, 1][updateSpeedLevel]
                //     : graphDLC.customUI.customTPSField!.getTicksPerFrame();
                const ticks = [1, 1, 1, 5, 20, 100, 500, 2000, 0, 1][
                    this.updateSpeedLevel
                ];

                if (accumulator > skip * 3) {
                    accumulator = skip;
                }

                if (
                    this.gameMap.rawGraph.graphState.changedNodes.length !== 0
                ) {
                    if (isMaxTPS) {
                        const timeLimit =
                            performance.now() +
                            1000 / TargetFPSSetting.value -
                            Math.min(
                                renderDelta,
                                1000 / TargetFPSSetting.value / 2,
                            );
                        do {
                            this.updateTick(e);
                            _this.updatesPerSecond++;
                        } while (performance.now() < timeLimit);
                        accumulator = 0;
                    } else {
                        while (accumulator >= skip) {
                            for (let i = 0; i < ticks; i++) {
                                this.updateTick(e);
                                _this.updatesPerSecond++;
                            }
                            accumulator -= skip;
                        }
                    }
                    if (
                        EnableBreakpointSetting.value &&
                        this.gameMap.rawGraph.graphState.breakPoint
                    ) {
                        this.gameMap.rawGraph.graphState.breakPoint = false;
                        this.playing = false;
                        patchLoader
                            .getInstance<UIPauseSign>('UIPauseSign')
                            ?.setVisibility(true);
                    }
                }

                if (performance.now() - _this.updateTime > 1000) {
                    _this.updateTime = performance.now();
                    _this.tps = _this.updatesPerSecond;
                    _this.updatesPerSecond = 0;
                    this.onFPSUpdate();
                }
            }
        };
    });
};
