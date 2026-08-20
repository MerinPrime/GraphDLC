import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { Game } from '@logic-arrows/player/game';
import type { UIMenu } from '@logic-arrows/ui/components/ui-menu';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import { SettingsUIBuilder } from './SettingsUIBuilder';

interface PrivateUIMenu {
    messagePanelDiv: HTMLDivElement;
}

export const PatchUIMenu: IPatcher = (
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
) => {
    const settingsManager = graphDLC.settingsManager;

    patchLoader.addDefinitionPatch('UIMenu', (_module: typeof UIMenu) => {
        return class UIMenu extends _module {
            public constructor(
                parent: HTMLElement,
                mapInfo: MapInfo,
                game: Game,
            ) {
                super(parent, mapInfo, game);

                const mapSettingsContainer = document.createElement('table');
                mapSettingsContainer.className = 'ui-map-settings';
                (this as any as PrivateUIMenu).messagePanelDiv.appendChild(
                    mapSettingsContainer,
                );

                const builder =
                    SettingsUIBuilder.forContainer(mapSettingsContainer);
                const settingGroups =
                    settingsManager.getSortedSettings('map-settings');

                builder.addGroups(settingGroups, true);
            }
        };
    });
};
