import { LayersDLC } from "../core/layersdlc";

export function PatchGame(layersdlc: LayersDLC) {
    layersdlc.patchLoader.addDefinitionPatch("Game", function (module: any): any {
        let lastUpdateTime = -1;
        let accumulator = 0;
        layersdlc.patchLoader.setDefinition("Game", class Game extends module {
            updateFrame(e=() => {}) {
                if (!this.playing) {
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
                layersdlc.gameMap = this.gameMap as any;
                if (layersdlc.graph === undefined && isMaxTPS) {
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

                layersdlc.tpsInfo!.updateInfo(this.tick - startTick);
                this.screenUpdated = true;
            }
            updateTick(callback=(() => {})) {
                callback(),
                layersdlc.patchLoader.getDefinition<any>('ChunkUpdates').update(this.gameMap, this.tick),
                this.tick++
            }
        });
    });
}

