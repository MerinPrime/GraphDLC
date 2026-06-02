import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { Game } from '@logic-arrows/player/game';
import type { UIMenu } from '@logic-arrows/ui/components/ui-menu';
import { PLATFORM } from '@logic-arrows/utils/platform';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { SortedSettingGroup } from 'src/core/settings/Manager';
import { TextColor } from 'src/core/utils/TextColor';

interface PrivateUIMenu {
    messagePanelDiv: HTMLDivElement;
}

export function PatchUIMenu(patchLoader: PatchLoader, graphDLC: GraphDLC) {
    const settingsManager = graphDLC.settingsManager;

    patchLoader.addDefinitionPatch('UIMenu', (_module: typeof UIMenu) => {
        return class UIMenu extends _module {
            mapSettingsContainer: HTMLDivElement;

            constructor(parent: HTMLElement, mapInfo: MapInfo, game: Game) {
                super(parent, mapInfo, game);

                this.mapSettingsContainer = document.createElement('table');
                this.mapSettingsContainer.className = 'ui-map-settings';
                (this as any as PrivateUIMenu).messagePanelDiv.appendChild(
                    this.mapSettingsContainer,
                );

                const settingGroups =
                    settingsManager.getSortedSettings('map-settings');
                settingGroups.forEach((group) => this.addGroup(group));
            }

            private addGroup(group: SortedSettingGroup) {
                this.addSpace(2);
                this.addText(group.group.text.get(), group.group.color);
                group.settings.forEach((setting) => {
                    this.addSpace(0.5);
                    this.addSetting(
                        setting.meta.name.get(),
                        () => setting.buildUIComponent(),
                        setting.meta.description?.get(),
                        setting.meta.nameColor,
                        setting.meta.descriptionColor,
                    );
                });
            }

            private addText(
                label: string,
                labelColor: TextColor = TextColor.BLACK,
            ) {
                const labelText = document.createElement('div');
                labelText.innerText = label;
                labelText.style.color = labelColor;
                this.mapSettingsContainer.appendChild(labelText);
            }

            private addSpace(size: number = 1) {
                const space = document.createElement('div');
                space.style.height = `${size}vh`;
                this.mapSettingsContainer.appendChild(space);
            }

            private addSetting(
                label: string,
                controlFactory: () => HTMLElement,
                description: string | null = null,
                labelColor: TextColor = TextColor.BLACK,
                descriptionColor: TextColor = TextColor.GRAY,
            ): void {
                const row = document.createElement('tr');
                this.mapSettingsContainer.appendChild(row);

                const nameCell = document.createElement('td');
                nameCell.classList.add('setting-name');

                const labelText = document.createElement('div');
                labelText.innerText = `${label}:`;
                labelText.style.color = labelColor;
                nameCell.appendChild(labelText);

                if (description && PLATFORM !== 'mobile') {
                    const descText = document.createElement('div');
                    descText.classList.add('setting-description');
                    descText.innerText = description;
                    descText.style.color = descriptionColor;
                    nameCell.appendChild(descText);
                }

                row.appendChild(nameCell);

                const valueCell = document.createElement('td');
                valueCell.classList.add('setting-value');
                valueCell.appendChild(controlFactory());
                row.appendChild(valueCell);
            }
        };
    });
}
