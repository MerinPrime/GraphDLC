import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { Backend } from '@logic-arrows/utils/backend';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from 'src/plugins/Patcher';
import { MapProtectionSetting } from '../settings/MapProtectionSetting';

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
