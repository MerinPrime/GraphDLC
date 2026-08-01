import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { CELL_SIZE, CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { UIPauseSign } from '@logic-arrows/ui/components/ui-pause-sign';
import type { GraphDLC } from 'src/core/GraphDLC';
import { NodeSignal } from 'src/core/graph/engines/core/NodeSignal';
import { NodeType } from 'src/core/graph/engines/core/NodeType';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { PathStep } from 'src/core/path_finder/types';
import { TargetFPSSetting } from 'src/core/settings/instances/performance/TargetFPSSetting';
import { TPSOverloadSetting } from 'src/core/settings/instances/performance/TPSOverloadSetting';
import { EnableArrowRelationsSetting } from 'src/core/settings/instances/tools/EnableArrowRelationsSetting';
import {
    BreakpointMode,
    EnableBreakpointSetting,
} from 'src/core/settings/instances/tools/EnableBreakpointSetting';
import { ShowArrowConnectionsSetting } from 'src/core/settings/instances/tools/ShowArrowConnectionsSetting';
import { ACTIVE_SIGNALS, ArrowSignal } from 'src/core/utils/ArrowSignal';
import { ArrowType } from 'src/core/utils/ArrowType';
import { Bounds } from 'src/core/utils/Bounds';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
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
    graphDLC: GraphDLC,
) => {
    let renderDelta = 0;
    let lastUpdateTime = -1;
    let accumulator = 0;
    let previousSpeed = 0;

    let adaptiveBatchSize = 100;

    const uiPauseSign = patchLoader.getInstance<UIPauseSign>('UIPauseSign');

    patchLoader.addDefinitionPatch('Game', (_module: typeof Game) => {
        return class Game extends _module {
            public path: PathStep[] | null = null;
            public customTPS: number = 1;

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

            public focusOnCell(x: number, y: number, speed: number = 1): void {
                const boxWidth: number =
                    this.width / 40 / window.devicePixelRatio;
                const boxHeight: number =
                    this.height / 40 / window.devicePixelRatio;

                const x0 = x - boxWidth / 2;
                const x1 = x + boxWidth / 2;
                const y0 = y - boxHeight / 2;
                const y1 = y + boxHeight / 2;

                this.focusOnBox(x0, y0, x1, y1, 0, speed);
            }

            public draw() {
                const renderStart = performance.now();

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

                this.drawPath(render, offsetX, offsetY);

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

                const renderEnd = performance.now();
                renderDelta = renderEnd - renderStart;
            }

            public updateFrame(payload = () => {}) {
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

                if (!this.gameMap.isMain) {
                    const tickDelta = 1000 / 3;
                    while (accumulator > tickDelta) {
                        this.updateTick(payload);
                        accumulator -= tickDelta;
                    }
                    return;
                }

                const isMaxTPS = this.updateSpeedLevel === 9;
                const isCustomTPS = this.updateSpeedLevel === 0;

                if (previousSpeed !== this.updateSpeedLevel) {
                    accumulator = 0;
                    previousSpeed = this.updateSpeedLevel;
                }

                const skip = [
                    1000 / 1,
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
                const perUpdateTicks = [1, 1, 1, 1, 5, 20, 100, 500, 2000, 0][
                    this.updateSpeedLevel
                ];

                const tickSpeed = [
                    0, 3, 12, 60, 300, 1200, 6000, 30000, 120000, 0,
                ][this.updateSpeedLevel];

                const UPDATE_BUDGET = 1000 / 30;

                if (this.gameMap.graph.engine.isChanged()) {
                    const breakMode = EnableBreakpointSetting.value;
                    const isBreakEnabled = breakMode !== BreakpointMode.OFF;
                    const startTick = this.gameMap.graph.engine.getTick();
                    if (isMaxTPS) {
                        const frameBudget = 1000 / TargetFPSSetting.value;

                        const browserOverhead = Math.max(4, frameBudget * 0.12);

                        const timeLimit =
                            performance.now() +
                            frameBudget -
                            Math.min(renderDelta, frameBudget / 2) -
                            browserOverhead;

                        let currentTime = performance.now();
                        let breakPoint = false;

                        while (
                            currentTime < timeLimit - 0.5 &&
                            (!breakPoint || !isBreakEnabled)
                        ) {
                            const remainingTime = timeLimit - currentTime;

                            const currentBatch = Math.max(
                                5,
                                Math.min(adaptiveBatchSize, 100000),
                            );

                            const startBatch = performance.now();

                            payload();
                            breakPoint =
                                this.gameMap.graph.engine.runManyTicks(
                                    currentBatch,
                                );

                            const endBatch = performance.now();
                            const elapsed = endBatch - startBatch;

                            currentTime = endBatch;

                            if (elapsed > 0.5) {
                                const singleTickDuration =
                                    elapsed / currentBatch;

                                const predictedTicks = Math.floor(
                                    (remainingTime * 0.8) / singleTickDuration,
                                );

                                const maxGrowth = currentBatch * 1.5;
                                adaptiveBatchSize = Math.floor(
                                    Math.max(
                                        5,
                                        Math.min(predictedTicks, maxGrowth),
                                    ),
                                );
                            } else {
                                adaptiveBatchSize = Math.floor(
                                    Math.max(
                                        5,
                                        Math.min(
                                            adaptiveBatchSize * 1.5,
                                            100000,
                                        ),
                                    ),
                                );
                            }
                        }

                        accumulator = 0;
                    } else if (TPSOverloadSetting.value || isCustomTPS) {
                        const targetTPS = isCustomTPS
                            ? this.customTPS
                            : tickSpeed;
                        const customSkipDelta = 1000 / targetTPS;
                        const customSkip = Math.max(customSkipDelta, 1000 / 60);
                        if (accumulator >= customSkip) {
                            payload();
                            let runTicks = Math.floor(
                                accumulator / customSkipDelta,
                            );
                            const maxTickBatch =
                                Math.round(targetTPS / 60 / 100) + 1;
                            const startTime = performance.now();
                            let breakPoint = false;
                            while (
                                performance.now() - startTime < UPDATE_BUDGET &&
                                runTicks > 0 &&
                                (!breakPoint || !isBreakEnabled)
                            ) {
                                const tickBatch = Math.min(
                                    runTicks,
                                    maxTickBatch,
                                );
                                breakPoint =
                                    this.gameMap.graph.engine.runManyTicks(
                                        tickBatch,
                                    );
                                accumulator -= tickBatch * customSkipDelta;
                                runTicks -= tickBatch;
                            }
                        }
                    } else {
                        let breakPoint = false;
                        while (
                            accumulator >= skip &&
                            (!breakPoint || !isBreakEnabled)
                        ) {
                            payload();
                            breakPoint =
                                this.gameMap.graph.engine.runManyTicks(
                                    perUpdateTicks,
                                );
                            accumulator -= skip;
                        }
                    }
                    if (isBreakEnabled) {
                        const breakpointIdx =
                            this.gameMap.graph.engine.getBreakpoint(true);
                        if (breakpointIdx !== false) {
                            this.playing = false;
                            uiPauseSign.val?.setVisibility(true);
                            if (breakMode === BreakpointMode.ON_ZOOM) {
                                const breakpointNode =
                                    this.gameMap.graph.getNode(breakpointIdx);
                                this.focusOnCell(
                                    breakpointNode.globalX,
                                    breakpointNode.globalY,
                                    1 / 30,
                                );
                            }
                        }
                    }
                    const endTick = this.gameMap.graph.engine.getTick();
                    const deltaTicks = endTick - startTick;
                    _this.tick += deltaTicks;
                    _this.updatesPerSecond += deltaTicks;
                } else {
                    accumulator = 0;
                }

                if (performance.now() - _this.updateTime > 1000) {
                    _this.updateTime = performance.now();
                    _this.tps = _this.updatesPerSecond;
                    _this.updatesPerSecond = 0;
                }
                this.onFPSUpdate();
            }
        };
    });
};
