import type { ChunkUpdates } from '@logic-arrows/game-logic/chunk-updates';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

export const PatchChunkUpdates: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'ChunkUpdates',
        (_module: typeof ChunkUpdates) => {
            _module.update = function GraphUpdate(gameMap: GameMap) {
                const rawGraph = gameMap.rawGraph;
                rawGraph.engine.runTick();
            };

            _module.clearSignals = function clearSignals(gameMap: GameMap) {
                gameMap.rawGraph.engine.reset();
            };
        },
    );
};
