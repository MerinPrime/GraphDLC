import {GameMap} from "../api/game_map";
import {Chunk} from "../api/chunk";
import {Arrow} from "../api/arrow";
import {LayersDLC} from "../core/layersdlc";

export function PatchChunkUpdates(layersdlc: LayersDLC) {
    layersdlc.patchLoader.addDefinitionPatch("ChunkUpdates", function (module: any): any {
        const oldUpdate = module.update;
        module.update = function update(game_map: GameMap, tick: number) {
            if (layersdlc.graph === undefined) {
                oldUpdate(game_map);
            } else {
                layersdlc.graph.update(tick);
            }
        }
        module.clearSignals = function clearSignals(game_map: GameMap) {
            game_map.chunks.forEach((chunk: Chunk) => {
                chunk.arrows.forEach((arrow: Arrow) => {
                    arrow.lastSignal = 0;
                    arrow.signal = 0;
                    arrow.signalsCount = 0;
                    arrow.blocked = 0;
                });
            });
            if (layersdlc.graph !== undefined) {
                layersdlc.graph.clearSignals();
            }
        }
    });
}