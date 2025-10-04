import {GameMap} from "../api/gameMap";
import {Chunk} from "../api/chunk";
import {Arrow} from "../api/arrow";
import {GraphDLC} from "../core/graphDLC";
import {Game} from "../api/game";
import {ChunkUpdates} from "../api/chunkUpdates";

export function PatchChunkUpdates(graphDLC: GraphDLC) {
    const patchLoader = graphDLC.patchLoader;
    const graphUpdater = graphDLC.graphUpdater;

    patchLoader.addDefinitionPatch("ChunkUpdates", function (module: ChunkUpdates): any {
        const oldUpdate = module.update;
        const oldClearSignals = module.clearSignals;
        
        module.update = function update(gameMap: GameMap, tick: number) {
            if (graphDLC.graphState !== undefined) {
                graphUpdater.updateState(graphDLC.graphState, tick);
            } else {
                oldUpdate(gameMap, tick);
            }
        }
        
        module.clearSignals = function clearSignals(game_map: GameMap) {
            if (graphDLC.graphState !== undefined) {
                graphUpdater.resetGraph(graphDLC.graphState);
                graphDLC.game!.tick = 0;
            } else {
                oldClearSignals(game_map);
            }
        }
    });
}
