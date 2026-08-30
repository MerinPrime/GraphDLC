import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { GamePage } from '@logic-arrows/pages/game-page';
import type { Backend } from '@logic-arrows/utils/backend';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

export const PatchBackend: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('Backend', (_module: typeof Backend) => {
        const GamePage = patchLoader.getInstance<GamePage>('GamePage');

        const oldSaveMap = _module.saveMap;
        _module.saveMap = async function PatchedSaveMap(
            mapInfo: MapInfo,
            newData: string,
        ): Promise<number> {
            const status = await oldSaveMap(mapInfo, newData);
            if (status === 200) GamePage.val?.updateIsMapChanged(false);
            return status;
        };

        const oldSaveMapInfo = _module.saveMapInfo;
        _module.saveMapInfo = async function PatchedSaveMap(
            mapInfo: MapInfo,
            callback: (responseStatus: number) => void,
        ): Promise<void> {
            await oldSaveMapInfo(mapInfo, (status: number) => {
                if (status === 200) GamePage.val?.updateIsMapChanged(false);
                callback(status);
            });
        };
    });
};
