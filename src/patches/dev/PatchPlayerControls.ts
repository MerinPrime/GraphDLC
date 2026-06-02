import { Game } from '@logic-arrows/player/game';
import { PlayerUI } from '@logic-arrows/player/player-ui';
import { PlayerControls } from '@logic-arrows/player/player-controls';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';

interface PrivatePlayerControls {
    game: Game;
    playerUI: PlayerUI;
}

export function PatchPlayerControls(
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
) {
    patchLoader.addDefinitionPatch(
        'PlayerControls',
        (_module: typeof PlayerControls) => {
            return class PlayerControls extends _module {
                public update(): void {
                    super.update();
                    (
                        this as any as PrivatePlayerControls
                    ).playerUI.updateDevDebugInfo();
                }
            };
        },
    );
}
