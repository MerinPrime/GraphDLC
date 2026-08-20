import type { SettingsPage } from '@logic-arrows/pages/settings-page';
import {
    GraphDLCPrefix,
    LatestVersionTextLocale,
    OutdatedVersionLocale,
    TestVersionTextLocale,
    VersionUnknownLocale,
} from 'src/core/credentials/Locale';
import { RepoLatestRelease } from 'src/core/credentials/version/Utils';
import { VersionState } from 'src/core/credentials/version/VersionState';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { DeveloperModeSetting } from 'src/core/settings/instances/developer/DeveloperModeSetting';
import { TextColor } from 'src/core/utils/TextColor';
import type { IPatcher } from '../Patcher';
import { SettingsUIBuilder } from './SettingsUIBuilder';

export const PatchSettingsPage: IPatcher = (
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
) => {
    const settingsManager = graphDLC.settingsManager;

    patchLoader.addDefinitionPatch(
        'SettingsPage',
        (_module: typeof SettingsPage) => {
            return class SettingsPage extends _module {
                public constructor(container: HTMLElement) {
                    super(container);

                    const lastSetting = this.mainDiv.querySelector(
                        'tr > td > .interface-mode-select',
                    )?.parentElement?.parentElement as HTMLElement;

                    const builder = SettingsUIBuilder.afterElement(lastSetting);

                    const settingGroups =
                        settingsManager.getSortedSettings('menu-settings');
                    builder.addGroups(settingGroups);

                    builder.addSpace(2);

                    const versionNode = builder.addText(
                        GraphDLCPrefix + VersionUnknownLocale.get(),
                        TextColor.MUTED,
                    );

                    versionNode.element.addEventListener('click', (e) => {
                        if (
                            e.target instanceof Element &&
                            e.target.closest('a')
                        ) {
                            return;
                        }
                        DeveloperModeSetting.value = true;
                        window.location.reload();
                    });

                    VersionState.subscribe((state) => {
                        if (state === 'latest') {
                            const text = __CURRENT_VERSION__.endsWith('-test')
                                ? TestVersionTextLocale.get()
                                : LatestVersionTextLocale.get();
                            versionNode.update(GraphDLCPrefix + text);
                        } else if (state === 'outdated') {
                            versionNode.update(
                                GraphDLCPrefix +
                                    OutdatedVersionLocale.get(
                                        RepoLatestRelease,
                                    ),
                            );
                        }
                    });
                }
            };
        },
    );
};
