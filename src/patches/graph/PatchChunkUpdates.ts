import type { ChunkUpdates } from '@logic-arrows/game-logic/chunk-updates';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';

export function PatchChunkUpdates(
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
) {
    patchLoader.addDefinitionPatch(
        'ChunkUpdates',
        (_module: typeof ChunkUpdates) => {
            let tick = 0;

            _module.update = function GraphUpdate(gameMap: GameMap) {
                gameMap.rawGraph.graphState.tick = tick;
                gameMap.rawGraph.graphUpdater.updateState(
                    gameMap.rawGraph.graphState,
                    tick++,
                );
            };

            _module.clearSignals = function clearSignals(gameMap: GameMap) {
                gameMap.rawGraph.graphState.reset(gameMap.rawGraph);
                tick = 0;
            };
        },
    );
}
