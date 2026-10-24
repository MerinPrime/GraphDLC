import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { Backend } from '@logic-arrows/utils/backend';
import type { GraphDLC } from 'src/core/GraphDLC';
import { tryLoadRustEngine } from 'src/core/graph/engines/native/loader';
import { tryLoadRustEngine as tryLoadRustExpEngine } from 'src/core/graph/engines/native_exp/loader';
import type { PatchLoader } from 'src/core/PatchLoader';
import {
    GraphEngine,
    GraphEngineSetting,
} from 'src/plugins/graphdlc/settings/performance/GraphEngineSetting';
import type { IPatcher } from '../../Patcher';

async function preloadRustEngine(): Promise<void> {
    if (GraphEngineSetting.value === GraphEngine.NATIVE) {
        await tryLoadRustEngine();
    } else if (GraphEngineSetting.value === GraphEngine.NATIVE_EXP) {
        await tryLoadRustExpEngine();
    } else if (
        GraphEngineSetting.value === GraphEngine.NATIVE_EXP_WITH_PATHES
    ) {
        await tryLoadRustExpEngine();
    }
}

export const PatchBackend: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addObjectPatch<typeof Backend>(
        'Backend',
        (namespace, original) => {
            namespace.getMap = async (
                id: string,
                callback: (mapInfo: MapInfo) => void,
            ): Promise<void> => {
                await preloadRustEngine();
                await original.getMap(id, callback);
            };

            namespace.getMaps = async (ids: string[]): Promise<MapInfo[]> => {
                const [, maps] = await Promise.all([
                    preloadRustEngine(),
                    original.getMaps(ids),
                ]);

                return maps;
            };

            namespace.getMapsInfo = async (): Promise<MapInfo[]> => {
                const [, mapsInfo] = await Promise.all([
                    preloadRustEngine(),
                    original.getMapsInfo(),
                ]);

                return mapsInfo;
            };
        },
    );
};
