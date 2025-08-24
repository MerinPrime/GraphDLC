import {LayersDLC} from "../core/layersDLC";
import {GameMap} from "../api/game_map";
import {Chunk} from "../api/chunk";
import {Arrow} from "../api/arrow";
import {NodeSignal} from "../graph_compiler/graph/nodeSignal";
import {getArrowRelations} from "../graph_compiler/ast/astParser";
import {ASTNode} from "../graph_compiler/ast/astNode";
import {ArrowType} from "../api/arrow_type";
import {ACTIVE_SIGNALS} from "../graph_compiler/handlers";
import {GraphState} from "../graph_compiler/graph/graphState";

export function PatchGame(layersDLC: LayersDLC) {
    const settings = layersDLC.settings;
    layersDLC.patchLoader.addDefinitionPatch("Game", function (module: any): any {
        let lastUpdateTime = -1;
        let accumulator = 0;
        layersDLC.patchLoader.setDefinition("Game", class Game extends module {
            // drawArrow
            draw() {
                const CELL_SIZE = layersDLC.patchLoader.getDefinition<number>("CELL_SIZE");
                const CHUNK_SIZE = layersDLC.patchLoader.getDefinition<number>("CHUNK_SIZE");
                const PlayerSettings = layersDLC.patchLoader.getDefinition<any>("PlayerSettings");
                const ChunkUpdates = layersDLC.patchLoader.getDefinition<any>("ChunkUpdates");
                
                const graphState = layersDLC.graphState;
                
                this.updateFocus(),
                (this.drawPastedArrows || 0 !== this.selectedMap.getSelectedArrows().length) && (this.screenUpdated = !0),
                PlayerSettings.framesToUpdate[this.updateSpeedLevel] > 1 && (this.screenUpdated = !0),
                this.screenUpdated && this.render.drawBackground(this.scale, [-this.offset[0] / CELL_SIZE, -this.offset[1] / CELL_SIZE]);
                const e = this.scale;
                this.render.prepareArrows(e);
                const t = ~~(-this.offset[0] / CELL_SIZE / 16) - 1
                    , s = ~~(-this.offset[1] / CELL_SIZE / 16) - 1
                    , o = ~~(-this.offset[0] / CELL_SIZE / 16 + this.width / this.scale / 16)
                    , a = ~~(-this.offset[1] / CELL_SIZE / 16 + this.height / this.scale / 16);
                if (this.render.setArrowAlpha(1),
                    this.gameMap.chunks.forEach(((e: Chunk) => {
                            if (!(e.x >= t && e.x <= o && e.y >= s && e.y <= a))
                                return;
                            const r = this.offset[0] * this.scale / CELL_SIZE + .025 * this.scale
                                , l = this.offset[1] * this.scale / CELL_SIZE + .025 * this.scale;
                            for (let t = 0; t < CHUNK_SIZE; t++)
                                for (let s = 0; s < CHUNK_SIZE; s++) {
                                    const o = e.getArrow(t, s);
                                    let signal = o.signal;
                                    let lastSignal = o.lastSignal;
                                    if (graphState) {
                                        const astIndex = o.astIndex;
                                        if (astIndex !== undefined) {
                                            signal = graphState.signals[astIndex];
                                            lastSignal = graphState.lastSignals[astIndex];
                                            if (signal === NodeSignal.ACTIVE) signal = ACTIVE_SIGNALS[o.type];
                                        }
                                    }
                                    if (o.type > 0 && (this.screenUpdated || ChunkUpdates.wasArrowChanged(o) || signal !== lastSignal)) {
                                        const i = (e.x * CHUNK_SIZE + t) * this.scale + r
                                            , a = (e.y * CHUNK_SIZE + s) * this.scale + l;
                                        this.render.drawArrow(i, a, o.type, signal, o.rotation, o.flipped)
                                    }
                                }
                        }
                    )),
                performance.now() - this.drawTime > 1e3 && (this.drawTime = performance.now(),
                    this.drawsPerSecond = 0),
                    this.drawsPerSecond++,
                    this.drawPastedArrows) {
                    this.render.setArrowAlpha(.5);
                    const e = this.selectedMap.getCopiedArrows();
                    0 !== e.size && (this.screenUpdated = !0),
                        e.forEach(( (b: Arrow, t: string) => {
                                const [s,i] = t.split(",").map((e => parseInt(e, 10)));
                                let o = s
                                    , a = i
                                    , r = 0;
                                1 === this.pasteDirection ? (o = -i,
                                    a = s,
                                    r = 1) : 2 === this.pasteDirection ? (o = -s,
                                    a = -i,
                                    r = 2) : 3 === this.pasteDirection && (o = i,
                                    a = -s,
                                    r = 3);
                                const l = (o + this.mousePosition[0]) * this.scale + this.offset[0] * this.scale / CELL_SIZE + .025 * this.scale
                                    , h = (a + this.mousePosition[1]) * this.scale + this.offset[1] * this.scale / CELL_SIZE + .025 * this.scale;
                                // SHOW RELATIONS
                                if (layersDLC.settings.data.showArrowTarget) {
                                    if (e.size === 1) {
                                        this.render.disableArrows();
                                        this.render.prepareSolidColor();
                                        this.render.setSolidColor(0.1, 1.0, 0.2, 0.1);
                                        const oo = this.scale;
                                        getArrowRelations(b.type).forEach(([x, y]) => {
                                            if (b.flipped) y = -y;
                                            let bx = 0;
                                            let by = 0;
                                            switch (b.rotation) {
                                                case 0: by += x; bx += y; break;
                                                case 1: bx -= x; by += y; break;
                                                case 2: by -= x; bx -= y; break;
                                                case 3: bx += x; by -= y; break;
                                            }
                                            this.render.drawSolidColor(bx * this.scale + l, by * this.scale + h, oo, oo);
                                        })
                                        this.render.disableSolidColor();
                                        this.render.prepareArrows(this.scale);
                                    }
                                }
                                this.render.drawArrow(l, h, b.type, b.signal, (b.rotation + r) % 4, b.flipped)
                            }
                        ))
                }
                if (this.render.disableArrows(),
                    this.render.prepareSolidColor(),
                    this.render.setSolidColor(.25, .5, 1, .25),
                    this.selectedMap.getSelectedArrows().forEach(((e: string) => {
                            const t = e.split(",").map((e => parseInt(e, 10)))
                                , s = t[0] * this.scale + this.offset[0] * this.scale / CELL_SIZE
                                , i = t[1] * this.scale + this.offset[1] * this.scale / CELL_SIZE
                                , o = this.scale + .05 * this.scale;
                            this.render.drawSolidColor(s, i, o, o)
                        }
                    )),
                    this.isSelecting) {
                    this.render.prepareSolidColor(),
                        this.render.setSolidColor(.5, .5, .75, .25);
                    const e = this.selectedMap.getCurrentSelectedArea();
                    if (void 0 !== e) {
                        const t = e[0] * this.scale + this.offset[0] * this.scale / CELL_SIZE
                            , s = e[1] * this.scale + this.offset[1] * this.scale / CELL_SIZE
                            , i = e[2] - e[0]
                            , o = e[3] - e[1];
                        this.render.drawSolidColor(t, s, i * this.scale, o * this.scale)
                    }
                }
                this.render.disableSolidColor(),
                    this.screenUpdated = !1,
                    this.frame++
                // SHOW RELATION ON ARROW AT MOUSE
                if (layersDLC.settings.data.showArrowConnections) {
                    const offsetX = this.offset[0] * this.scale / CELL_SIZE + .025 * this.scale;
                    const offsetY = this.offset[1] * this.scale / CELL_SIZE + .025 * this.scale;
                    const arrowAtCursor = this.gameMap.getArrow(this.mousePosition[0], this.mousePosition[1]);
                    if (arrowAtCursor && layersDLC.rootNode) {
                        this.render.disableArrows();
                        this.render.prepareSolidColor();
                        const oo = this.scale;
                        if (arrowAtCursor.astNode) {
                            this.render.setSolidColor(0.1, 1.0, 0.2, 0.1);
                            arrowAtCursor.astNode.allEdges.forEach((edge: ASTNode) => {
                                edge.arrows.forEach((ar) => {
                                    if (!ar.x || !ar.y) return;
                                    this.render.drawSolidColor(ar.x * this.scale + offsetX, ar.y * this.scale + offsetY, oo, oo);
                                });
                            })
                            this.render.setSolidColor(1.0, 0.2, 0.0, 0.1);
                            arrowAtCursor.astNode.backEdges.forEach((edge: ASTNode) => {
                                edge.arrows.forEach((ar) => {
                                    if (ar.x === undefined || ar.y === undefined) return;
                                    this.render.drawSolidColor(ar.x * this.scale + offsetX, ar.y * this.scale + offsetY, oo, oo);
                                });
                            });
                            this.render.setSolidColor(0.2, 0.1, 1.0, 0.1);
                            arrowAtCursor.astNode.arrows.forEach((ar: Arrow) => {
                                if (ar.x === undefined || ar.y === undefined) return;
                                this.render.drawSolidColor(ar.x * this.scale + offsetX, ar.y * this.scale + offsetY, oo, oo);
                            });
                        } else if (arrowAtCursor.type !== ArrowType.EMPTY) {
                            this.render.setSolidColor(0.0, 0.0, 0.0, 0.1);
                            if (arrowAtCursor.x === undefined || arrowAtCursor.y === undefined) return;
                            this.render.drawSolidColor(arrowAtCursor.x * this.scale + offsetX, arrowAtCursor.y * this.scale + offsetY, oo, oo);
                        }
                        this.render.disableSolidColor();
                        this.screenUpdated = true;
                    }
                }
            }
            
            updateFrame(e=() => {}) {
                layersDLC.gameMap = this.gameMap as GameMap;
                layersDLC.game = this as any;
                if (!this.playing || (settings.data.debugMode !== 0 && layersDLC.rootNode)) {
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
                
                const updateSpeedLevel = layersDLC.graphState ? this.updateSpeedLevel : Math.min(this.updateSpeedLevel, 6);
                const isMaxTPS = updateSpeedLevel === 8;

                const skip = [1000 / 3, 1000 / 12, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60][updateSpeedLevel];
                const ticks = [1, 1, 1, 5, 20, 100, 500, 2000, 0][updateSpeedLevel];

                if (accumulator > skip * 3) {
                    accumulator = skip;
                }

                while (accumulator >= skip) {
                    if (isMaxTPS) {
                        const start = performance.now();
                        do {
                            this.updateTick(e);
                        } while (performance.now() < start + 1000 / 60)
                    } else {
                        for (let i = 0; i < ticks; i++) {
                            this.updateTick(e);
                        }
                    }
                    accumulator -= skip;
                }
                if (performance.now() - this.updateTime > 1000) {
                    this.updateTime = performance.now();
                    this.updatesPerSecond = 0;
                }
                this.updatesPerSecond++;

                layersDLC.tpsInfo?.updateInfo(this.tick - startTick);
                this.screenUpdated = true;
            }
            updateTick(callback=(() => {})) {
                callback();
                layersDLC.patchLoader.getDefinition<any>('ChunkUpdates').update(this.gameMap, this.tick);
                this.tick++;
            }
        });
    });
}

