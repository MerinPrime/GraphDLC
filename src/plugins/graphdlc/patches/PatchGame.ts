import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { CELL_SIZE, CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
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
