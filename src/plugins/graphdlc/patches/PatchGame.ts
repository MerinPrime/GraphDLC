import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import {
    CELL_SIZE,
    CHUNK_AREA,
    CHUNK_SIZE,
} from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import { NodeSignal } from 'src/core/graph/engines/core/NodeSignal';
import type { PatchLoader } from 'src/core/PatchLoader';
import { ACTIVE_SIGNALS, ArrowSignal } from 'src/core/utils/ArrowSignal';
import { ArrowType } from 'src/core/utils/ArrowType';
import { Bounds } from 'src/core/utils/Bounds';
import type { IPatcher } from '../../Patcher';

interface PrivateGame {
    gameMap: GameMap;
    readonly render: GameRender;
}

let bulkIndicesBuffer = new Uint32Array(1024);

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

            public getDrawOffsets(): { offsetX: number; offsetY: number } {
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

                const dirtyChunksIdx = engine.getDirtyChunks(false, bounds);
                const visibleChunks: Array<{ chunk: Chunk; idx: number }> = [];

                for (let i = 0; i < dirtyChunksIdx.length; i++) {
                    const dirtyChunkIdx = dirtyChunksIdx[i];
                    const chunk = graph.getChunkByIdx(dirtyChunkIdx);
                    if (chunk) {
                        visibleChunks.push({ chunk, idx: dirtyChunkIdx });
                    }
                }

                if (visibleChunks.length > 0) {
                    if (engine.fillNodeSignalsBulk) {
                        const totalArrows = visibleChunks.length * CHUNK_AREA;
                        if (bulkIndicesBuffer.length < totalArrows) {
                            bulkIndicesBuffer = new Uint32Array(
                                Math.max(totalArrows, bulkIndicesBuffer.length * 2),
                            );
                        }

                        let offset = 0;
                        for (let i = 0; i < visibleChunks.length; i++) {
                            const chunk = visibleChunks[i].chunk;
                            const arrows = chunk.getArrows();
                            for (let j = 0; j < CHUNK_AREA; j++) {
                                const arrow = arrows[j];
                                const astIndex = arrow.astIndex;
                                bulkIndicesBuffer[offset++] =
                                    astIndex != null && arrow.type !== ArrowType.EMPTY
                                        ? astIndex
                                        : 0xffffffff;
                            }
                        }

                        const signals = engine.fillNodeSignalsBulk(
                            bulkIndicesBuffer.subarray(0, totalArrows),
                        );

                        offset = 0;
                        for (let i = 0; i < visibleChunks.length; i++) {
                            const { chunk, idx: dirtyChunkIdx } = visibleChunks[i];
                            const arrows = chunk.getArrows();
                            for (let j = 0; j < CHUNK_AREA; j++) {
                                const arrow = arrows[j];
                                if (
                                    arrow.astIndex == null ||
                                    arrow.type === ArrowType.EMPTY
                                ) {
                                    arrow.signal = ArrowSignal.NONE;
                                } else {
                                    const signal = signals[offset];
                                    if (signal === NodeSignal.ACTIVE) {
                                        arrow.signal = ACTIVE_SIGNALS[arrow.type];
                                    } else if (signal === NodeSignal.PENDING) {
                                        arrow.signal = ArrowSignal.BLUE;
                                    } else {
                                        arrow.signal = ArrowSignal.NONE;
                                    }
                                }
                                offset++;
                            }
                            engine.makeUndirtyChunk(dirtyChunkIdx);
                            chunk.markRenderDirty();
                        }
                    } else {
                        visibleChunks.forEach(({ chunk, idx: dirtyChunkIdx }) => {
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
                    }
                }

                super.draw();

                const { render } = this as any as PrivateGame;
                render.setShowBorder(false);

                const { offsetX, offsetY } = this.getDrawOffsets();

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
