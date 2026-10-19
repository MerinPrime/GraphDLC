import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import {
    copyOrDownloadBlob,
    downloadBlob,
    generateFilename,
} from 'src/core/utils/Blobs';
import type { IPatcher } from '../../Patcher';
import type { Mp4Options } from './types';

interface PrivatePlayerControls {
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
                        if (code === 'Escape') {
                            if (playerUI.tryHideVideoModal()) return;

                            if (playerUI.isGifRecording()) {
                                playerUI.cancelGifRecording();
                                return;
                            }
                        } else if (code === 'KeyL') {
                            if (playerUI.isRecordModalOpen) {
                                return;
                            }

                            if (playerUI.isGifRecording()) {
                                if (_this.keyboardHandler.getShiftPressed()) {
                                    playerUI.stopGifRecording();
                                }
                                return;
                            }

                            if (
                                _this.game.selectedMap.getSelectedArrows()
                                    .length === 0
                            ) {
                                console.log("Can't take screenshot/video");
                                return;
                            }

                            if (_this.keyboardHandler.getShiftPressed()) {
                                playerUI.showVideoModal(
                                    async (options) => {
                                        let videoBlob: Blob | null = null;

                                        if (options.format === 'gif') {
                                            videoBlob =
                                                await _this.game.renderGif(
                                                    options,
                                                );
                                        } else if (options.format === 'apng') {
                                            videoBlob =
                                                await _this.game.renderApng(
                                                    options,
                                                );
                                        } else {
                                            videoBlob =
                                                await _this.game.renderMp4(
                                                    options as Mp4Options,
                                                );
                                        }

                                        if (!videoBlob) {
                                            console.error("Can't make video");
                                            return;
                                        }

                                        const fileExtension =
                                            options.format === 'apng'
                                                ? 'png'
                                                : options.format;
                                        const fileName = generateFilename(
                                            'graphdlc',
                                            fileExtension,
                                        );
                                        downloadBlob(videoBlob, fileName);
                                    },
                                    () => {
                                        console.log('Recording cancelled');
                                    },
                                );
                            } else {
                                const isAltPressed =
                                    _this.keyboardHandler.getKeyPressed(
                                        'AltLeft',
                                    ) ||
                                    _this.keyboardHandler.getKeyPressed(
                                        'AltRight',
                                    );
                                _this.game
                                    .captureScreenshot({
                                        showSolidColor: isAltPressed,
                                    })
                                    .then(async (blob) => {
                                        if (!blob) {
                                            return;
                                        }
                                        const result = await copyOrDownloadBlob(
                                            blob,
                                            generateFilename('graphdlc', 'png'),
                                        );
                                        if (!result.success) {
                                            console.warn(
                                                "Can't take screenshot!",
                                            );
                                        } else if (
                                            result.method === 'clipboard'
                                        ) {
                                            console.log('Screenshot copied.');
                                        } else if (
                                            result.method === 'download'
                                        ) {
                                            console.log('Screenshot saved.');
                                        }
                                    });
                            }
                            return;
                        }

                        if (oldKeyDownCallback) oldKeyDownCallback(code, key);
                    };
                }
            };
        },
    );
};
