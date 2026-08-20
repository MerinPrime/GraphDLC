import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerArrowActions } from '@logic-arrows/player/player-arrow-actions';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

interface PrivatePlayerControls {
    readonly keyboardHandler: KeyboardHandler;
    readonly arrowActions: PlayerArrowActions;
}

export const PatchPlayerControls: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'PlayerControls',
        (_module: typeof PlayerControls) => {
            return class PlayerControls extends _module {
                public constructor(
                    cnv: HTMLCanvasElement,
                    game: Game,
                    playerUI: PlayerUI,
                    history?: GameHistory | null,
                ) {
                    super(cnv, game, playerUI, history);

                    const _this = this as any as PrivatePlayerControls;

                    const oldKeyUpCallback = _this.keyboardHandler.onKeyUp;
                    _this.keyboardHandler.onKeyUp = (code: string) => {
                        if (code === 'KeyE') {
                            _this.arrowActions.hideSelectionTip();
                        }
                        if (oldKeyUpCallback) oldKeyUpCallback(code);
                    };
                }
            };
        },
    );
};
