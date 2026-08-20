import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

interface PrivatePlayerControls {
    readonly playerUI: PlayerUI;
    readonly game: Game;
    readonly keyboardHandler: KeyboardHandler;
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

                    const oldKeyDownCallback = _this.keyboardHandler.onKeyDown;
                    _this.keyboardHandler.onKeyDown = (
                        code: string,
                        key: string,
                    ) => {
                        if (
                            _this.playerUI.speedController?.customTPSField?.isFocused()
                        ) {
                            if (
                                code === 'Enter' ||
                                code === 'NumpadEnter' ||
                                code === 'Escape'
                            ) {
                                _this.playerUI.speedController?.customTPSField?.blur();
                            }
                            return;
                        }
                        if (oldKeyDownCallback) oldKeyDownCallback(code, key);
                    };
                }

                public update(): void {
                    super.update();

                    const _this = this as any as PrivatePlayerControls;

                    _this.game.customTPS =
                        _this.playerUI.speedController?.customTPSField.tps || 1;
                }
            };
        },
    );
};
