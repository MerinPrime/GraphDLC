import type { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { DarkThemeSetting } from 'src/plugins/dark_theme/settings/DarkThemeSetting';
import type { IPatcher } from '../../Patcher';

export const PatchGame: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('Game', (_module: typeof Game) => {
        return class Game extends _module {
            public draw(): void {
                // @ts-expect-error
                this.render.setDarkTheme(DarkThemeSetting.value);
                super.draw();
            }
        };
    });
};
