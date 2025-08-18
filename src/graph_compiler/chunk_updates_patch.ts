import {PatchLoader} from "../loader/patchloader";
import {CompiledMapGraph} from "./compiled_map_graph";
import {GameMap} from "../api/game_map";
import {Chunk} from "../api/chunk";
import {Arrow} from "../api/arrow";
import {ArrowType} from "../api/arrow_type";

let doRecompile: boolean = false;
let totalOffset = 0;
let tpsInfo;
let currentTick = 0;
export let debugRing = false;

window.addEventListener('keydown', function(event) {
    if (event.code === 'KeyP') {
        doRecompile = true;
        event.preventDefault();
    }
});

export function PatchChunkUpdates(patchLoader: PatchLoader) {
    patchLoader.addDefinitionPatch("ChunkUpdates", function (name: string, module: any): any {
        const oldUpdate = module.update;
        module.update = function update(game_map: GameMap) {
            if (doRecompile) {
                currentTick = 0;
                doRecompile = false;
                totalOffset = 0;
                game_map.compiled_graph = new CompiledMapGraph();
                game_map.compiled_graph.compile_from(game_map);
            }
            if (debugRing) {
                return;
            }
            if (game_map.compiled_graph === undefined) {
                oldUpdate(game_map);
            } else {
                game_map.compiled_graph.update(currentTick++);
            }
        }
        module.clearSignals = function clearSignals(game_map: GameMap) {
            currentTick = 0;
            game_map.chunks.forEach((chunk: Chunk) => {
                chunk.arrows.forEach((arrow: Arrow) => {
                    arrow.lastSignal = 0;
                    arrow.signal = 0;
                    arrow.signalsCount = 0;
                    arrow.blocked = 0;
                });
            });
            if (game_map.compiled_graph !== undefined) {
                game_map.compiled_graph.graph.clearSignals();
            }
        }
    });
}

export function PatchGameMap(patchLoader: PatchLoader) {
    function tryResetMapIfCompiled(gameMap: GameMap) {
        if (gameMap.compiled_graph === undefined) {
            return;
        }
        gameMap.compiled_graph = undefined;
        gameMap.chunks.forEach((chunk: Chunk) => {
            chunk.arrows.forEach((arrow: Arrow) => {
                arrow.signalsCount = 0;
            });
        });
    }
    patchLoader.addDefinitionPatch("GameMap", function (name: string, module: typeof GameMap): any {
        patchLoader.setDefinition("GameMap", class GameMapPatched extends module {
            setArrowType(x: number, y: number, type: ArrowType) {
                super.setArrowType(x, y, type);
                tryResetMapIfCompiled(this);
            }
            setArrowSignal(x: number, y: number, signal: number) {
                super.setArrowSignal(x, y, signal);
                tryResetMapIfCompiled(this);
            }
            setArrowRotation(x: number, y: number, direction: number) {
                super.setArrowRotation(x, y, direction);
                tryResetMapIfCompiled(this);
            }
            setArrowFlipped(x: number, y: number, flipped: boolean) {
                super.setArrowFlipped(x, y, flipped);
                tryResetMapIfCompiled(this);
            }
            resetArrow(x: number, y: number, force: boolean) {
                super.resetArrow(x, y, force);
                tryResetMapIfCompiled(this);
            }
            removeArrow(x: number, y: number) {
                super.removeArrow(x, y);
                tryResetMapIfCompiled(this);
            }
        });
    });
}

export function PatchPlayerControls(patchLoader: PatchLoader) {
    patchLoader.addDefinitionPatch("PlayerControls", function (name: string, module: any): any {
        patchLoader.setDefinition("PlayerControls", class PlayerControls extends module {
            constructor(...args: any[]) {
                super(...args);
                this.mouseHandler.leftClickCallback = () => {
                    const arrow = this.getArrowByMousePosition();
                    const shiftPressed = this.keyboardHandler.getShiftPressed();

                    if (!arrow || !this.freeCursor || shiftPressed) return;

                    const isTargetType = arrow.type === 21 || arrow.type === 24;
                    if (!isTargetType) return;

                    const hasCompiledGraph = this.game.gameMap.compiled_graph !== undefined;
                    const shouldSetSignal = arrow.signal === 0 || this.game.playing;

                    if (shouldSetSignal) {
                        if (arrow.type === ArrowType.BUTTON) {
                            arrow.signal = 5;
                            if (hasCompiledGraph) {
                                this.game.gameMap.compiled_graph.graph.changed_nodes.add(arrow.graph_node);
                            }
                        } else {
                            if (hasCompiledGraph) {
                                const buttonEdge = arrow.graph_node.buttonEdge;
                                if (!buttonEdge) {
                                    arrow.signal = 5;
                                    this.game.gameMap.compiled_graph.graph.changed_nodes.add(arrow.graph_node);
                                } else {
                                    buttonEdge.arrow.signal = buttonEdge.handler.active_signal;
                                    buttonEdge.lastSignal = 0;
                                    this.game.gameMap.compiled_graph.graph.changed_nodes.add(buttonEdge);
                                    this.game.gameMap.compiled_graph.graph.delayed_update.add(buttonEdge);
                                }
                            } else {
                                arrow.signal = 5;
                            }
                        }
                    } else {
                        arrow.signal = 0;
                    }

                    this.game.screenUpdated = true;
                };
                const prevKeyDownCallback = this.keyboardHandler.keyDownCallback;
                this.keyboardHandler.keyDownCallback = (code: string, key: number) => {
                    prevKeyDownCallback(code, key);
                    // if (code === 'KeyT') {
                    //     const e = this.mouseHandler.getMousePosition();
                    //     const t = e[0] * window.devicePixelRatio / this.game.scale - this.game.offset[0] / patchLoader.getDefinition("CELL_SIZE");
                    //     const s = e[1] * window.devicePixelRatio / this.game.scale - this.game.offset[1] / patchLoader.getDefinition("CELL_SIZE");
                    //     const i = ~~t - (t < 0 ? 1 : 0);
                    //     const n = ~~s - (s < 0 ? 1 : 0);
                    //     this.game.selectedMap.select(i, n);
                    //    
                    // }
                };
            }
        });
    });
}

export function PatchGame(patchLoader: PatchLoader) {
    patchLoader.addDefinitionPatch("Game", function (name: string, module: any): any {
        let PlayerSettings;
        let lastUpdateTime = performance.now();
        let accumulator = 0;
        patchLoader.setDefinition("Game", class Game extends module {
            draw(...args: any[]) {
                // const now = Date.now();
                super.draw(...args);
                // if (this.playing && this.updateSpeedLevel === 5) {
                //     totalOffset += Date.now() - now;
                // }
            }
            updateFrame(e=() => {}) {
                if (!this.playing) {
                    return
                }
                PlayerSettings ??= patchLoader.getDefinition('PlayerSettings');
                const startTick = this.tick;
                if (this.updateSpeedLevel === 8) {
                    do {
                        const now = Date.now();
                        let recompiled = doRecompile;
                        this.updateTick(e);
                        if (!recompiled) {
                            totalOffset += Date.now() - now;
                        }
                        this.screenUpdated = true;
                    } while (totalOffset < 1000 / 60);
                    totalOffset -= 1000 / 60;
                    if (totalOffset > 1000 / 60 * 5) {
                        totalOffset = 0;
                    }
                }
                else {
                    if (this.gameMap.compiled_graph === undefined) {
                        this.updateSpeedLevel = Math.min(this.updateSpeedLevel, 5)
                    }
                    const now = performance.now();
                    const delta = now - lastUpdateTime;
                    lastUpdateTime = now;
                    accumulator += delta;

                    const skip = [1000 / 3, 1000 / 12, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60, 1000 / 60][this.updateSpeedLevel];
                    const ticks = [1, 1, 1, 5, 20, 100, 500, 2000][this.updateSpeedLevel];
                    
                    if (accumulator > skip * 3) {
                        accumulator = skip;
                    }
                    
                    while (accumulator >= skip) {
                        for (let i = 0; i < ticks; i++) {
                            this.updateTick(e);
                        }
                        accumulator -= skip;
                        this.screenUpdated = true;
                    }
                    performance.now() - this.updateTime > 1e3 && (this.updateTime = performance.now(),
                        this.updatesPerSecond = 0),
                        this.updatesPerSecond++
                }
                tpsInfo!.updateInfo(this.tick - startTick);
            }
        });
    });
}

export function PatchPlayerSettings(patchLoader: PatchLoader) {
    patchLoader.addDefinitionPatch("PlayerSettings", function (name: string, module: any): any {
        module.framesToSkip.push(1, 1);
        module.framesToUpdate.push(500, 2000);
    });
}

export function PatchPlayerUI(patchLoader: PatchLoader) {
    patchLoader.addDefinitionPatch("PlayerUI", function (name: string, module: any): any {
        let UIRange: any;
        let PlayerSettings: any;
        let GameText: any;
        let TPSInfo: any;
        patchLoader.setDefinition("PlayerUI", class PlayerUI extends module {
            addSpeedController() {
                UIRange ??= patchLoader.getDefinition('UIRange');
                PlayerSettings ??= patchLoader.getDefinition('PlayerSettings');
                GameText ??= patchLoader.getDefinition('GameText');
                TPSInfo ??= patchLoader.getDefinition('TPSInfo');
                this.speedController = new UIRange(document.body, 9, (e: number) => {
                    if (e === 8) {
                        return 'MAX TPS';
                    }
                    return `${PlayerSettings.framesToUpdate[e] / PlayerSettings.framesToSkip[e] * 60} ${GameText.PER_SECOND.get()}`;
                });
                tpsInfo = new TPSInfo(document.body);
            }
        });
    });
}

export function PatchTPSInfo(patchLoader: PatchLoader) {
    patchLoader.addDefinitionPatch("UIComponent", function (name: string, UIComponent: any): any {
        patchLoader.setDefinition("TPSInfo", class TPSInfo extends UIComponent {
            info: HTMLElement;
            // element: HTMLElement | undefined;
            tps: number;
            updatedTicks: number;
            lastUpdate: number;

            constructor(...args: any[]) {
                super(...args);
                this.info = document.createElement("div");
                this.element!.appendChild(this.info);
                this.tps = 0;
                this.updatedTicks = 0;
                this.lastUpdate = Date.now();
            }

            updateInfo(updatedTicks: number) {
                this.updatedTicks += updatedTicks;
                const now = Date.now();
                if (now - this.lastUpdate < 500) {
                    return;
                }
                this.tps = this.updatedTicks / (now - this.lastUpdate) * 1000;
                this.updatedTicks = 0;
                this.lastUpdate = now;
                this.info.innerText = `TPS: ${Math.floor(this.tps)}`;
            }

            getClass() {
                return "cuicomponent tps-info"
            }
        });
    });
}