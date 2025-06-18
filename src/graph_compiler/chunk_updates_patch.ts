import {PatchLoader} from "../loader/patchloader";
import {CompiledMapGraph} from "./compiled_map_graph";
import {GraphNode} from "./graph_node";
import {GameMap} from "../api/game_map";
import {Chunk} from "../api/chunk";
import {Arrow} from "../api/arrow";

let doRecompile: boolean = false;
let totalOffset = 0;

window.addEventListener('keydown', function(event) {
    if (event.key === 'p') {
        doRecompile = true;
        event.preventDefault();
    }
});

export function PatchChunkUpdates(patchLoader: PatchLoader) {
    patchLoader.addDefinitionPatch("ChunkUpdates", function (name: string, module: any): any {
        const oldUpdate = module.update;
        module.update = function update(game_map: GameMap) {
            if (doRecompile) {
                alert('Recompiled') // TODO: game.screenUpdated = true
                doRecompile = false;
                totalOffset = 0;
                game_map.compiled_graph = new CompiledMapGraph();
                game_map.compiled_graph.compile_from(game_map);
            }
            if (game_map.compiled_graph === undefined) {
                oldUpdate(game_map);
            } else {
                game_map.compiled_graph.update();
            }
        }
        module.clearSignals = function clearSignals(game_map: GameMap) {
            game_map.chunks.forEach((chunk: Chunk) => {
                chunk.arrows.forEach((arrow: Arrow) => {
                    arrow.lastSignal = 0;
                    arrow.signal = 0;
                    arrow.signalsCount = 0;
                    arrow.detectorSignal = 0;
                    arrow.blocked = 0;
                    arrow.pending = false;
                });
            });
            if (game_map.compiled_graph !== undefined) {
                game_map.compiled_graph.changed_nodes = new Set(game_map.compiled_graph.entry_points);
                game_map.compiled_graph.restarted = true;
            }
        }
    });
}

export function PatchGameMap(patchLoader: PatchLoader) {
    function clearSignalsCount(gameMap: GameMap) {
        gameMap.chunks.forEach((chunk: Chunk) => {
            chunk.arrows.forEach((arrow: Arrow) => {
                arrow.signalsCount = 0;
            });
        });
    }
    patchLoader.addDefinitionPatch("GameMap", function (name: string, module: any): any {
        patchLoader.setDefinition("GameMap", class GameMapM extends module {
            setArrowType(...args: any[]) {
                super.setArrowType(...args);
                this.compiled_graph = undefined;
                clearSignalsCount((this as any) as GameMap);
            }
            setArrowSignal(...args: any[]) {
                super.setArrowSignal(...args);
                this.compiled_graph = undefined;
                clearSignalsCount((this as any) as GameMap);
            }
            setArrowRotation(...args: any[]) {
                super.setArrowRotation(...args);
                this.compiled_graph = undefined;
                clearSignalsCount((this as any) as GameMap);
            }
            setArrowFlipped(...args: any[]) {
                super.setArrowFlipped(...args);
                this.compiled_graph = undefined;
                clearSignalsCount((this as any) as GameMap);
            }
            resetArrow(...args: any[]) {
                super.resetArrow(...args);
                this.compiled_graph = undefined;
                clearSignalsCount((this as any) as GameMap);
            }
            removeArrow(...args: any[]) {
                super.removeArrow(...args);
                this.compiled_graph = undefined;
                clearSignalsCount((this as any) as GameMap);
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
                    const e = this.getArrowByMousePosition()
                        , t = this.keyboardHandler.getShiftPressed();
                    void 0 !== e && this.freeCursor && !t && (21 !== e.type && 24 !== e.type || (0 === e.signal || this.game.playing ? (e.signal = 5, (() => {
                        if (this.game.gameMap.compiled_graph !== undefined) {
                            this.game.gameMap.compiled_graph.changed_nodes.add(e.graph_node);
                        }
                    })()) : e.signal = 0,
                        this.game.screenUpdated = !0))
                }
            }
        });
    });
}

export function PatchGame(patchLoader: PatchLoader) {
    patchLoader.addDefinitionPatch("Game", function (name: string, module: any): any {
        let PlayerSettings;
        patchLoader.setDefinition("Game", class Game extends module {
            draw(...args: any[]) {
                super.draw(...args);
            }
            updateFrame(e=() => {}) {
                if (!this.playing) {
                    return
                }
                PlayerSettings ??= patchLoader.getDefinition('PlayerSettings');
                if (this.updateSpeedLevel === 5) {
                    let frames = 0;
                    do {
                        const now = Date.now();
                        this.updateTick(e);
                        totalOffset += Date.now() - now;
                        frames += 1;
                    } while (totalOffset < 1000 / 60)
                    totalOffset -= 1000 / 60;
                    console.log(totalOffset, frames);
                }
                else {
                    if (this.frame % PlayerSettings.framesToSkip[this.updateSpeedLevel] == 0)
                        for (let t = 0; t < PlayerSettings.framesToUpdate[this.updateSpeedLevel]; t++)
                            this.updateTick(e),
                            performance.now() - this.updateTime > 1e3 && (this.updateTime = performance.now(),
                                this.updatesPerSecond = 0),
                                this.updatesPerSecond++
                }
            }
        });
    });
}

export function PatchPlayerUI(patchLoader: PatchLoader) {
    patchLoader.addDefinitionPatch("PlayerUI", function (name: string, module: any): any {
        let UIRange: any;
        let PlayerSettings: any;
        let GameText: any;
        patchLoader.setDefinition("PlayerUI", class PlayerUI extends module {
            addSpeedController() {
                UIRange ??= patchLoader.getDefinition('UIRange');
                PlayerSettings ??= patchLoader.getDefinition('PlayerSettings');
                GameText ??= patchLoader.getDefinition('GameText');
                this.speedController = new UIRange(document.body, 6, (e: number) => {
                    if (e === 5) {
                        return 'MAX TPS';
                    }
                    return `${PlayerSettings.framesToUpdate[e] / PlayerSettings.framesToSkip[e] * 60} ${GameText.PER_SECOND.get()}`;
                })
            }
        });
    });
}