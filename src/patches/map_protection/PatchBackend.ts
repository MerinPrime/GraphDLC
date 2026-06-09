import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { Backend } from '@logic-arrows/utils/backend';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { MapProtectionSetting } from 'src/core/settings/instances/other/MapProtectionSetting';
import type { IPatcher } from '../Patcher';

export const PatchBackend: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('Backend', (_module: typeof Backend) => {
        const oldSaveMap = _module.saveMap;
        _module.saveMap = async function PatchedSaveMap(
            mapInfo: MapInfo,
            newData: string,
        ): Promise<number> {
            if (MapProtectionSetting.value) {
                return -1;
            }
            return oldSaveMap(mapInfo, newData);
        };
    });
};
