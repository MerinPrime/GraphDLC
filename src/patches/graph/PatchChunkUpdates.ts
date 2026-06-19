import type { ChunkUpdates } from '@logic-arrows/game-logic/chunk-updates';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
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
            const oldUpdate = _module.update;
            //@ts-expect-error
            _module.oldUpdate = oldUpdate;
            _module.update = function GraphUpdate(gameMap: GameMap) {
                if (gameMap.isMain) {
                    const graph = gameMap.graph;
                    graph.engine.runTick();
                } else {
                    oldUpdate(gameMap);
                }
                patchLoader
                    .getInstance<PlayerUI>('PlayerUI')
                    ?.updateFpsDisplay();
            };

            const oldClearSignals = _module.clearSignals;
            //@ts-expect-error
            _module.oldClearSignals = oldClearSignals;
            _module.clearSignals = function clearSignals(gameMap: GameMap) {
                if (gameMap.isMain) {
                    const graph = gameMap.graph;
                    graph.engine.reset();
                } else {
                    oldClearSignals(gameMap);
                }
                patchLoader
                    .getInstance<PlayerUI>('PlayerUI')
                    ?.updateFpsDisplay();
            };
        },
    );
};
