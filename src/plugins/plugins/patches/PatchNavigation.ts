import type { GameText } from '@logic-arrows/lang/game-text';
import type { MenuPage } from '@logic-arrows/pages/menu-page';
import type { MenuPageType } from '@logic-arrows/pages/menu-page-type';
import type { Navigation } from '@logic-arrows/pages/navigation';
import type { NavigationActionType } from '@logic-arrows/pages/navigation-action-type';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import { PluginsPageName } from './Locale';
import { PluginsPage } from './PluginsPage';

export const PatchNavigation: IPatcher = (
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'Navigation',
        (_module: typeof Navigation) => {
            const _GameText =
                patchLoader.getDefinition<typeof GameText>('GameText');
            const _MenuPage =
                patchLoader.getDefinition<typeof MenuPage>('MenuPage');

            // @ts-expect-error
            return class Navigation extends _module {
                private pluginsPage: PluginsPage | null = null;

                public constructor() {
                    super();
                    //@ts-expect-error
                    const oldDoMenuAction = this.doMenuAction;
                    //@ts-expect-error
                    this.doMenuAction = (
                        pageType: MenuPageType | 'plugins',
                    ) => {
                        if (pageType === 'plugins') {
                            this.goToPlugins('go');
                        } else {
                            oldDoMenuAction(pageType);
                        }
                    };
                }

                public goToPath(action: NavigationActionType): void {
                    if (window.location.pathname === '/plugins')
                        this.goToPlugins(action);
                    //@ts-expect-error
                    else super.goToPath(action);
                }

                public goToPlugins(e: string) {
                    //@ts-expect-error
                    if (this.menuPage !== null) {
                        //@ts-expect-error
                        this.menuPage.page?.dispose();
                    } else {
                        //@ts-expect-error
                        this.removePages();
                        //@ts-expect-error
                        this.menuPage = new _MenuPage.val(
                            'plugins' as MenuPageType,
                            //@ts-expect-error
                            this.doMenuAction,
                        );
                    }
                    document.title = `${PluginsPageName.get()} | ${_GameText.val.ARROWS_TITLE.get()}`;
                    this.pluginsPage = new PluginsPage(
                        graphDLC.pluginManager,
                        //@ts-expect-error
                        this.menuPage.getContent(),
                    );
                    //@ts-expect-error
                    this.menuPage.page = this.pluginsPage;

                    if (e === 'go')
                        window.history.pushState(null, '', 'plugins');
                    else if (e === 'start')
                        window.history.replaceState(null, '', 'plugins');
                    else if (e === 'return')
                        //@ts-expect-error
                        this.menuPage.setCategory('plugins' as MenuPageType);
                }
            };
        },
    );
};
