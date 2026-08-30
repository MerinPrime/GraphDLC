import type { MenuPage } from '@logic-arrows/pages/menu-page';
import type { MenuPageType } from '@logic-arrows/pages/menu-page-type';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import { PluginsPageName } from './Locale';

export const PatchMenuPage: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('MenuPage', (_module: typeof MenuPage) => {
        return class MenuPage extends _module {
            public constructor(
                firstPage: MenuPageType,
                action: (pageType: MenuPageType) => void,
            ) {
                super(firstPage, action);
                // @ts-expect-error
                this.categories.set('plugins', [
                    PluginsPageName.get(),
                    'res/icons/icon-news.svg',
                    null,
                ]);
                // @ts-expect-error
                this.addMenuItem('plugins');
                // @ts-expect-error
                this.selectedCategory = firstPage;
                // @ts-expect-error
                this.updateSelectedCategory();
            }
        };
    });
};
