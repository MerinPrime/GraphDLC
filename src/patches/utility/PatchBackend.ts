import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { Game } from '@logic-arrows/player/game';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { Backend } from '@logic-arrows/utils/backend';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { MapProtectionSetting } from 'src/core/settings/instances/other/MapProtectionSetting';

interface PrivateGamePage {
    isDeleted: boolean;
    playerUI: PlayerUI;
    game: Game;
    mapInfo: MapInfo;

    autosave(): Promise<void>;
    saveMap(buffer: number[]): Promise<number>;
}

export function PatchBackend(patchLoader: PatchLoader, graphDLC: GraphDLC) {
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
}
