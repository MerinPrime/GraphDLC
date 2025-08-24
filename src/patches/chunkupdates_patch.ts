import {GameMap} from "../api/game_map";
import {Chunk} from "../api/chunk";
import {Arrow} from "../api/arrow";
import {LayersDLC} from "../core/layersDLC";
import {Game} from "../api/game";

export function PatchChunkUpdates(layersDLC: LayersDLC) {
    layersDLC.patchLoader.addDefinitionPatch("ChunkUpdates", function (module: any): any {
        const oldUpdate = module.update;
        module.update = function update(game_map: GameMap, tick: number) {
            if (layersDLC.graphState === undefined) {
                oldUpdate(game_map);
            } else {
                layersDLC.graphUpdater.updateState(layersDLC.graphState, tick);
            }
        }
        module.clearSignals = function clearSignals(game_map: GameMap) {
            if (layersDLC.graphState !== undefined) {
                layersDLC.graphUpdater.resetGraph(layersDLC.graphState);
                layersDLC.game!.tick = 0;
            } else {
                game_map.chunks.forEach((chunk: Chunk) => {
                    chunk.arrows.forEach((arrow: Arrow) => {
                        arrow.lastSignal = 0;
                        arrow.signal = 0;
                        arrow.signalsCount = 0;
                        arrow.blocked = 0;
                    });
                });
            }
        }
    });
}