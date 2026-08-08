import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { GamePage } from '@logic-arrows/pages/game-page';
import type { Game } from '@logic-arrows/player/game';
import type { UIMenu } from '@logic-arrows/ui/components/ui-menu';
import type { save } from '@logic-arrows/utils/save';
import type { Utils } from '@logic-arrows/utils/utils';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

export const Save_PatchUIMenu: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('UIMenu', (_module: typeof UIMenu) => {
        const GamePage = patchLoader.getInstance<GamePage>('GamePage');
        const _save = patchLoader.getInstance<typeof save>('save');
        const _Utils = patchLoader.getInstance<typeof Utils>('Utils');

        // @ts-expect-error
        return class UIMenu extends _module {
            public constructor(
                parent: HTMLElement,
                mapInfo: MapInfo,
                game: Game,
            ) {
                super(parent, mapInfo, game);

                if (_save.val && _Utils.val) {
                    const buffer: number[] = _save.val(game.gameMap);
                    const data: string = _Utils.val.arrayBufferToBase64(buffer);
                    if (data === mapInfo.data) {
                        GamePage.val?.updateIsMapChanged(false);
                    }
                }
            }

            public async saveMap(mapInfo: MapInfo, game: Game): Promise<void> {
                // @ts-expect-error
                await super.saveMap(mapInfo, game);
            }
        };
    });
};
