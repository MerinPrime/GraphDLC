import {GraphDLC} from "../core/graphDLC";
import {GameMap} from "../api/gameMap";
import {Arrow} from "../api/arrow";
import {getArrowRelations} from "../ast/astParser";
import {ASTNode} from "../ast/astNode";
import {ArrowType} from "../api/arrowType";
import {ChunkUpdates} from "../api/chunkUpdates";
import {GameProto} from "../api/game";

export function PatchGame(graphDLC: GraphDLC) {
    const patchLoader = graphDLC.patchLoader;
    const settings = graphDLC.settings;
    
    const CellSizePtr = patchLoader.getDefinitionPtr<number>('CELL_SIZE');
    const ChunkUpdatesPtr = patchLoader.getDefinitionPtr<ChunkUpdates>('ChunkUpdates');

    let renderDelta = 0;
    let lastUpdateTime = -1;
    let accumulator = 0;
    let previousSpeed = 0;
    
    patchLoader.addDefinitionPatch("Game", function (module: GameProto): any {
        patchLoader.setDefinition("Game", class Game_GDLC extends module {
            constructor(canvas: HTMLCanvasElement, width: number, height: number) {
                super(canvas, width, height);
                this.render.game = this;
            }
            
            draw() {
                const renderStart = performance.now();
                const CELL_SIZE = CellSizePtr.definition;
                
                super.draw();

                this.render.prepareSolidColor();
                const offsetX = this.offset[0] * this.scale / CELL_SIZE + 0.025 * this.scale;
                const offsetY = this.offset[1] * this.scale / CELL_SIZE + 0.025 * this.scale;
                const arrowAtCursor = this.gameMap.getArrow(this.mousePosition[0], this.mousePosition[1]);
                const scale = this.scale;
                let selectedArrowDrawn = false;
                if (settings.data.showArrowTarget && this.drawPastedArrows) {
                    const copiedArrows = [...this.selectedMap.getCopiedArrows().values()];
                    if (copiedArrows.length === 1) {
                        this.render.setSolidColor(0.0, 1.0, 0.0, 0.25);
                        const arrow = copiedArrows[0];
                        getArrowRelations(arrow.type).forEach(([x, y]) => {
                            if (arrow.flipped) y = -y;
                            let bx = this.mousePosition[0];
                            let by = this.mousePosition[1];
                            switch (arrow.rotation) {
                                case 0: by += x; bx += y; break;
                                case 1: bx -= x; by += y; break;
                                case 2: by -= x; bx -= y; break;
                                case 3: bx += x; by -= y; break;
                            }
                            this.render.drawSolidColor(bx * this.scale + offsetX, by * this.scale + offsetY, scale, scale);
                        });
                        selectedArrowDrawn = true;
                    }
                }
                if (!selectedArrowDrawn && settings.data.showArrowConnections && graphDLC.rootNode) {
                    if (arrowAtCursor) {
                        const astNode = graphDLC.rootNode.astNodes.get(arrowAtCursor);
                        if (astNode) {
                            this.render.setSolidColor(0.0, 1.0, 0.0, 0.25);
                            astNode.allEdges.forEach((edge: ASTNode) => {
                                edge.arrows.forEach((ar) => {
                                    if (ar.x === undefined || ar.y === undefined) return;
                                    this.render.drawSolidColor(ar.x * scale + offsetX, ar.y * scale + offsetY, scale, scale);
                                });
                            })
                            this.render.setSolidColor(1.0, 0.0, 0.0, 0.25);
                            astNode.backEdges.forEach((edge: ASTNode) => {
                                edge.arrows.forEach((ar) => {
                                    if (ar.x === undefined || ar.y === undefined) return;
                                    this.render.drawSolidColor(ar.x * scale + offsetX, ar.y * scale + offsetY, scale, scale);
                                });
                            });
                            this.render.setSolidColor(0.0, 0.0, 1.0, 0.25);
                            astNode.arrows.forEach((ar: Arrow) => {
                                if (ar.x === undefined || ar.y === undefined) return;
                                this.render.drawSolidColor(ar.x * scale + offsetX, ar.y * scale + offsetY, scale, scale);
                            });
                        } else if (arrowAtCursor.type !== ArrowType.EMPTY) {
                            const cycleID = arrowAtCursor.cycleID;
                            if (cycleID !== undefined) {
                                const cycle = graphDLC.rootNode.cycles[cycleID];
                                if (cycle !== undefined) {
                                    this.render.setSolidColor(0.0, 0.5, 0.5, 0.25);
                                    for (let i = 0; i < cycle.length; i++) {
                                        const arrow = cycle.cycle[i];
                                        this.render.drawSolidColor(arrow.x! * scale + offsetX, arrow.y! * scale + offsetY, scale, scale);
                                    }
                                }
                            } else {
                                this.render.setSolidColor(0.0, 0.0, 0.0, 0.25);
                                if (arrowAtCursor.x === undefined || arrowAtCursor.y === undefined) return;
                                this.render.drawSolidColor(arrowAtCursor.x * scale + offsetX, arrowAtCursor.y * scale + offsetY, scale, scale);
                            }
                        }
                        this.screenUpdated = true;
                    }
                }
                this.render.disableSolidColor();
                const renderEnd = performance.now();
                renderDelta = renderEnd - renderStart;
            }
            
            updateFrame(e=() => {}) {
                graphDLC.gameMap = this.gameMap as GameMap;
                graphDLC.game = this as any;
                if (!this.playing || (settings.data.debugMode !== 0 && graphDLC.rootNode)) {
                    lastUpdateTime = -1;
                    return;
                }
                
                if (lastUpdateTime === -1) {
                    lastUpdateTime = performance.now();
                }

                const startTick = this.tick;

                const now = performance.now();
                const delta = now - lastUpdateTime;
                lastUpdateTime = now;
                accumulator += delta;
                
                const isMaxTPS = this.updateSpeedLevel === 8;
                const isCustomTPS = this.updateSpeedLevel === 9;
                const updateSpeedLevel = isMaxTPS || isCustomTPS ? this.updateSpeedLevel : (graphDLC.graphState ? this.updateSpeedLevel : Math.min(this.updateSpeedLevel, 6));

                if (previousSpeed !== updateSpeedLevel) {
                    accumulator = 0;
                    previousSpeed = updateSpeedLevel;
                }
                
                const skip = [1000 / 3, 1000 / 12, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60][updateSpeedLevel];
                const ticks = !isCustomTPS ? [1, 1, 1, 5, 20, 100, 500, 2000, 0, 1][updateSpeedLevel] : graphDLC.customUI.customTPSField!.getTicksPerFrame();
                
                if (accumulator > skip * 3) {
                    accumulator = skip;
                }

                if (isMaxTPS) {
                    const timeLimit = performance.now() + 1000 / settings.data.targetFPS - Math.min(renderDelta, 1000 / settings.data.targetFPS / 2);
                    do {
                        this.updateTick(e);
                    } while (performance.now() < timeLimit)
                    accumulator = 0;
                } else {
                    while (accumulator >= skip) {
                        for (let i = 0; i < ticks; i++) {
                            this.updateTick(e);
                        }
                        accumulator -= skip;
                    }
                }
                if (performance.now() - this.updateTime > 1000) {
                    this.updateTime = performance.now();
                    this.updatesPerSecond = 0;
                }
                this.updatesPerSecond++;

                graphDLC.customUI.tpsInfo?.updateTicks(this.tick - startTick);
                this.screenUpdated = true;
            }
            updateTick(callback=(() => {})) {
                callback();
                ChunkUpdatesPtr.definition.update(this.gameMap, this.tick);
                this.tick++;
            }
        });
    });
}

