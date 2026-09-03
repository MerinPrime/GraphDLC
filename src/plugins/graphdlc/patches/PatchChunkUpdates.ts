import type { ChunkUpdates } from '@logic-arrows/game-logic/chunk-updates';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

export const PatchChunkUpdates: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    const playerUI = patchLoader.getInstance<PlayerUI>('PlayerUI');

    patchLoader.addObjectPatch<typeof ChunkUpdates>(
        'ChunkUpdates',
        (namespace, original) => {
            namespace.update = (gameMap: GameMap) => {
                if (gameMap.isMain) {
                    const graph = gameMap.graph;
                    graph.engine.runTick();
                } else {
                    original.update(gameMap);
                }

                playerUI.val?.updateFpsDisplay();
            };
            namespace.oldUpdate = original.update;

            namespace.clearSignals = (gameMap: GameMap) => {
                if (gameMap.isMain) {
                    const graph = gameMap.graph;
                    graph.engine.reset();
                } else {
                    original.clearSignals(gameMap);
                }

                playerUI.val?.updateFpsDisplay();
            };
            namespace.oldClearSignals = original.clearSignals;
        },
    );
};
