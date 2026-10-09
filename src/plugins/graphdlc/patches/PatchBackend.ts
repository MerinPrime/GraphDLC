import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { Backend } from '@logic-arrows/utils/backend';
import type { GraphDLC } from 'src/core/GraphDLC';
import { tryLoadRustEngine } from 'src/core/graph/engines/native/loader';
import type { PatchLoader } from 'src/core/PatchLoader';
import {
    GraphEngine,
    GraphEngineSetting,
} from 'src/plugins/graphdlc/settings/performance/GraphEngineSetting';
import type { IPatcher } from '../../Patcher';

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
                if (GraphEngineSetting.value === GraphEngine.NATIVE) {
                    await tryLoadRustEngine();
                }
                await original.getMap(id, callback);
            };

            namespace.getMaps = async (ids: string[]): Promise<MapInfo[]> => {
                if (GraphEngineSetting.value === GraphEngine.NATIVE) {
                    const [, maps] = await Promise.all([
                        tryLoadRustEngine(),
                        original.getMaps(ids),
                    ]);

                    return maps;
                }

                return await original.getMaps(ids);
            };

            namespace.getMapsInfo = async (): Promise<MapInfo[]> => {
                if (GraphEngineSetting.value === GraphEngine.NATIVE) {
                    const [, mapsInfo] = await Promise.all([
                        tryLoadRustEngine(),
                        original.getMapsInfo(),
                    ]);

                    return mapsInfo;
                }

                return await original.getMapsInfo();
            };
        },
    );
};
