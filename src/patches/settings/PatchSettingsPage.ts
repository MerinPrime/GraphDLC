import type { SettingsPage } from '@logic-arrows/pages/settings-page';
import {
    GraphDLCPrefix,
    LatestVersionTextLocale,
    OutdatedVersionLocale,
    TestVersionTextLocale,
    VersionUnknownLocale,
} from 'src/core/credentials/Locale';
import { VersionState } from 'src/core/credentials/version/VersionState';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { DeveloperModeSetting } from 'src/core/settings/instances/developer/DeveloperModeSetting';
import type { SortedSettingGroup } from 'src/core/settings/Manager';
import { TextColor } from 'src/core/utils/TextColor';
import type { IPatcher } from '../Patcher';

export const PatchSettingsPage: IPatcher = (
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
) => {
    const settingsManager = graphDLC.settingsManager;

    patchLoader.addDefinitionPatch(
        'SettingsPage',
        (_module: typeof SettingsPage) => {
            return class SettingsPage extends _module {
                private lastElement: HTMLElement;

                public constructor(container: HTMLElement) {
                    super(container);

                    const lastSetting = this.mainDiv.querySelector(
                        'tr > td > .interface-mode-select',
                    )?.parentElement?.parentElement as HTMLElement;

                    this.lastElement = lastSetting;

                    const settingGroups =
                        settingsManager.getSortedSettings('menu-settings');
                    settingGroups.forEach((group) => {
                        this.addGroup(group);
                    });
                    this.addSpace(2);
                    const versionNode = this.addText(
                        GraphDLCPrefix + VersionUnknownLocale.get(),
                        TextColor.MUTED,
                    );
                    const versionElement = versionNode.element;
                    versionElement.addEventListener('click', (e) => {
                        if (
                            e.target instanceof Element &&
                            e.target.closest('a')
                        ) {
                            return;
                        }
                        DeveloperModeSetting.value = true;
                        window.location.reload();
                    });
                    const versionUpdate = versionNode.update;
                    VersionState.subscribe((state) => {
                        if (state === 'latest') {
                            if (__CURRENT_VERSION__.endsWith('-test')) {
                                versionUpdate(
                                    GraphDLCPrefix +
                                        TestVersionTextLocale.get(),
                                );
                            } else {
                                versionUpdate(
                                    GraphDLCPrefix +
                                        LatestVersionTextLocale.get(),
                                );
                            }
                        } else if (state === 'outdated') {
                            versionUpdate(
                                GraphDLCPrefix +
                                    OutdatedVersionLocale.get(
                                        'https://github.com/MerinPrime/GraphDLC/releases/latest',
                                    ),
                            );
                        }
                    });
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
                    labelColor: TextColor = TextColor.PRIMARY,
                ): {
                    element: HTMLDivElement;
                    update: (newText: string, newColor?: TextColor) => void;
                } {
                    const labelText = document.createElement('div');
                    labelText.innerHTML = label;
                    labelText.classList.add(labelColor);
                    this.lastElement.after(labelText);
                    this.lastElement = labelText;
                    return {
                        element: labelText,
                        update: (
                            newText: string,
                            newColor: TextColor = labelColor,
                        ) => {
                            labelText.classList.remove(labelColor);
                            labelText.innerHTML = newText;
                            labelText.classList.add(newColor);
                            labelColor = newColor;
                        },
                    };
                }

                private addSpace(size: number = 1) {
                    const space = document.createElement('div');
                    space.style.height = `${size}vh`;
                    this.lastElement.after(space);
                    this.lastElement = space;
                }

                private addSetting(
                    label: string,
                    controlFactory: () => HTMLElement,
                    description: string | null = null,
                    labelColor: TextColor = TextColor.PRIMARY,
                    descriptionColor: TextColor = TextColor.MUTED,
                ): void {
                    const row = document.createElement('tr');
                    this.lastElement.after(row);
                    this.lastElement = row;

                    const nameCell = document.createElement('td');
                    nameCell.classList.add('setting-name');

                    const labelText = document.createElement('div');
                    labelText.innerText = `${label}:`;
                    labelText.classList.add(labelColor);
                    nameCell.appendChild(labelText);

                    if (description) {
                        const descText = document.createElement('div');
                        descText.classList.add('setting-description');
                        descText.innerText = description;
                        descText.classList.add(descriptionColor);
                        nameCell.appendChild(descText);
                    }

                    row.appendChild(nameCell);

                    const valueCell = document.createElement('td');
                    valueCell.classList.add('setting-value');
                    valueCell.appendChild(controlFactory());
                    row.appendChild(valueCell);
                }
            };
        },
    );
};
