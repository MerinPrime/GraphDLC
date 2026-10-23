import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { MouseHandler } from '@logic-arrows/controls/mouse-handler';
import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerArrowActions } from '@logic-arrows/player/player-arrow-actions';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import { NodeSignal } from 'src/core/graph/engines/core/NodeSignal';
import type { PatchLoader } from 'src/core/PatchLoader';
import { ArrowType } from 'src/core/utils/ArrowType';
import type { IPatcher } from '../../Patcher';

interface PrivatePlayerControls {
    readonly playerUI: PlayerUI;
    readonly game: Game;
    readonly keyboardHandler: KeyboardHandler;
    readonly mouseHandler: MouseHandler;
    readonly arrowActions: PlayerArrowActions;

    getArrowByMousePosition(): Arrow | undefined;
}

export const PatchPlayerControls: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'PlayerControls',
        (_module: typeof PlayerControls) => {
            // @ts-expect-error
            return class PlayerControls extends _module {
                private _rewindActive = false;
                private _rewindStartTime = 0;
                private _lastRewindTime = 0;

                public constructor(
                    cnv: HTMLCanvasElement,
                    game: Game,
                    playerUI: PlayerUI,
                    history?: GameHistory | null,
                ) {
                    super(cnv, game, playerUI, history);

                    const _this = this as any as PrivatePlayerControls;

                    const oldLeftClickCallback =
                        _this.mouseHandler.leftClickCallback;

                    _this.mouseHandler.leftClickCallback = () => {
                        oldLeftClickCallback();
                        const arrow: Arrow | undefined =
                            _this.getArrowByMousePosition();
                        const shiftPressed: boolean =
                            _this.keyboardHandler.getShiftPressed();
                        const freeCursor: boolean =
                            _this.arrowActions.isFreeCursor();

                        if (
                            arrow !== undefined &&
                            freeCursor &&
                            !shiftPressed
                        ) {
                            if (
                                arrow.type === ArrowType.BUTTON ||
                                arrow.type === ArrowType.DIRECTIONAL_BUTTON
                            ) {
                                if (arrow.astIndex != null) {
                                    const engine =
                                        _this.game.gameMap.graph.engine;
                                    const state = arrow.signal !== 0;
                                    const signal = state
                                        ? NodeSignal.ACTIVE
                                        : NodeSignal.NONE;
                                    engine.setNodeSignal(
                                        arrow.astIndex,
                                        signal,
                                    );
                                }
                            }
                        }
                    };

                    const oldKeyDownCallback = _this.keyboardHandler.onKeyDown;
                    _this.keyboardHandler.onKeyDown = (
                        code: string,
                        key: string,
                    ) => {
                        if (
                            _this.keyboardHandler.getShiftPressed() &&
                            (code === 'Enter' || code === 'NumpadEnter') &&
                            !_this.game.playing
                        ) {
                            return;
                        }
                        if (oldKeyDownCallback) oldKeyDownCallback(code, key);
                    };
                }

                private stepRewind(): void {
                    const _this = this as any as PrivatePlayerControls;
                    const engine = _this.game.gameMap.graph.engine;
                    const tick = engine.getTick();
                    if (tick > 0) {
                        engine.rewindToTick(tick - 1);
                        _this.playerUI.updateFpsDisplay();
                    }
                }

                public clearSignals() {
                    // @ts-expect-error
                    super.clearSignals();
                    const _this = this as any as PrivatePlayerControls;
                    _this.playerUI.startTickFrom = 0;
                }

                public update(): void {
                    const _this = this as any as PrivatePlayerControls;
                    const keyboard = _this.keyboardHandler;

                    const isEnter =
                        keyboard.getKeyPressed('Enter') ||
                        keyboard.getKeyPressed('NumpadEnter');
                    const isShift = keyboard.getShiftPressed();

                    if (isShift && isEnter && !_this.game.playing) {
                        const now = performance.now();
                        const INITIAL_DELAY = 400;
                        const REPEAT_INTERVAL = 50;

                        if (!this._rewindActive) {
                            this._rewindActive = true;
                            this._rewindStartTime = now;
                            this._lastRewindTime = now;
                            this.stepRewind();
                        } else if (
                            now - this._rewindStartTime >=
                            INITIAL_DELAY
                        ) {
                            if (now - this._lastRewindTime >= REPEAT_INTERVAL) {
                                this._lastRewindTime = now;
                                this.stepRewind();
                            }
                        }
                    } else {
                        this._rewindActive = false;
                    }

                    if (
                        keyboard.getCtrlPressed() &&
                        keyboard.getKeyPressed('KeyA')
                    ) {
                        for (const chunk of _this.game.gameMap.chunks.values()) {
                            for (let x: number = 0; x < CHUNK_SIZE; x++) {
                                for (let y: number = 0; y < CHUNK_SIZE; y++) {
                                    if (
                                        chunk.getArrow(x, y).type ===
                                        ArrowType.EMPTY
                                    )
                                        continue;
                                    _this.game.selectedMap.select(
                                        chunk.x * CHUNK_SIZE + x,
                                        chunk.y * CHUNK_SIZE + y,
                                    );
                                }
                            }
                        }
                        _this.game.selectedMap.updateSelectionFromCurrentSelection();
                        return;
                    }

                    super.update();
                }
            };
        },
    );
};
