import type { ChunkUpdates } from '@logic-arrows/game-logic/chunk-updates';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { EnableSnapshotsSetting } from 'src/core/settings/instances/other/EnableSnapshotsSetting';
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
                if (EnableSnapshotsSetting.value) {
                    rawGraph.stateRewinder.saveSnapshot(rawGraph.graphState);
                }
                rawGraph.graphUpdater.updateState(rawGraph.graphState);
            };

            _module.clearSignals = function clearSignals(gameMap: GameMap) {
                gameMap.rawGraph.graphState.reset();
                gameMap.rawGraph.stateRewinder.reset();
            };
        },
    );
};
