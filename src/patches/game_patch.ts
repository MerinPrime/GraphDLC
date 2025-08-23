import { LayersDLC } from "../core/layersDLC";
import { GameMap } from "../api/game_map";

export function PatchGame(layersDLC: LayersDLC) {
    const settings = layersDLC.settings;
    layersDLC.patchLoader.addDefinitionPatch("Game", function (module: any): any {
        let lastUpdateTime = -1;
        let accumulator = 0;
        layersDLC.patchLoader.setDefinition("Game", class Game extends module {
            updateFrame(e=() => {}) {
                layersDLC.gameMap = this.gameMap as GameMap;
                if (!this.playing || (settings.data.debugMode !== 0 && (layersDLC.graph !== undefined || true))) {
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
                
                let updateSpeedLevel = this.updateSpeedLevel;
                const isMaxTPS = updateSpeedLevel === 8;
                if (layersDLC.graph === undefined && isMaxTPS) {
                    updateSpeedLevel = Math.min(updateSpeedLevel, 5);
                }

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

