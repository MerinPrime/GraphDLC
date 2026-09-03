import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { GamePage } from '@logic-arrows/pages/game-page';
import type { Backend } from '@logic-arrows/utils/backend';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import { SaveMode, SaveModeSetting } from '../settings/SaveModeSetting';

export const PatchBackend: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    const GamePage = patchLoader.getInstance<GamePage>('GamePage');

    patchLoader.addObjectPatch<typeof Backend>(
        'Backend',
        (namespace, original) => {
            namespace.saveMap = async (
                mapInfo: MapInfo,
                newData: string,
            ): Promise<number> => {
                if (SaveModeSetting.value === SaveMode.NEVER) {
                    return -1;
                }
                const status = await original.saveMap(mapInfo, newData);
                if (status === 200) GamePage.val?.updateIsMapChanged(false);
                return status;
            };

            namespace.saveMapInfo = async (
                mapInfo: MapInfo,
                callback: (responseStatus: number) => void,
            ): Promise<void> => {
                if (SaveModeSetting.value === SaveMode.NEVER) {
                    return;
                }
                await original.saveMapInfo(mapInfo, (status: number) => {
                    if (status === 200) GamePage.val?.updateIsMapChanged(false);
                    callback(status);
                });
            };
        },
    );
};
