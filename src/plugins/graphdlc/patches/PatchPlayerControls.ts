import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { MouseHandler } from '@logic-arrows/controls/mouse-handler';
import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerAccess } from '@logic-arrows/player/player-access';
import type { PlayerArrowActions } from '@logic-arrows/player/player-arrow-actions';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import { PLATFORM } from '@logic-arrows/utils/platform';
import type { GraphDLC } from 'src/core/GraphDLC';
import { NodeSignal } from 'src/core/graph/engines/core/NodeSignal';
import type { PatchLoader } from 'src/core/PatchLoader';
import { ArrowType } from 'src/core/utils/ArrowType';
import { KeyRepeater } from 'src/core/utils/KeyRepeater';
import type { IPatcher } from '../../Patcher';

interface PrivatePlayerControls {
    readonly history: GameHistory | null;
    readonly playerUI: PlayerUI;
    readonly game: Game;
    readonly keyboardHandler: KeyboardHandler;
    readonly mouseHandler: MouseHandler;
    readonly arrowActions: PlayerArrowActions;
    readonly playerAccess: PlayerAccess;

    getArrowByMousePosition(): Arrow | undefined;
    undo(): void;
    redo(): void;
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
                private readonly _rewindRepeater = new KeyRepeater();
                private readonly _stepForwardRepeater = new KeyRepeater();
                private readonly _undoRepeater = new KeyRepeater();
                private readonly _redoRepeater = new KeyRepeater();

                private readonly _cleanupMouseNavigation: () => void;
                private _isDisposed = false;

                public constructor(
                    cnv: HTMLCanvasElement,
                    game: Game,
                    playerUI: PlayerUI,
                    history?: GameHistory | null,
                ) {
                    super(cnv, game, playerUI, history);

                    this._cleanupMouseNavigation = this.setupMouseNavigation();
                    this.setupLeftClick();
                    this.setupKeyInterception();
                }

                private setupMouseNavigation(): () => void {
                    const handleMouseUp = (e: MouseEvent) => {
                        if (this._isDisposed) return;
                        if (e.button === 3) {
                            e.preventDefault();
                            e.stopPropagation();
                            window.history.back();
                        } else if (e.button === 4) {
                            e.preventDefault();
                            e.stopPropagation();
                            window.history.forward();
                        }
                    };

                    const handlePrevent = (e: MouseEvent) => {
                        if (this._isDisposed) return;
                        if (e.button === 3 || e.button === 4) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    };

                    window.addEventListener('mouseup', handleMouseUp, true);
                    window.addEventListener('mousedown', handlePrevent, true);
                    window.addEventListener('auxclick', handlePrevent, true);

                    return () => {
                        window.removeEventListener(
                            'mouseup',
                            handleMouseUp,
                            true,
                        );
                        window.removeEventListener(
                            'mousedown',
                            handlePrevent,
                            true,
                        );
                        window.removeEventListener(
                            'auxclick',
                            handlePrevent,
                            true,
                        );
                    };
                }

                private setupLeftClick(): void {
                    const _this = this as any as PrivatePlayerControls;
                    const oldLeftClick = _this.mouseHandler.leftClickCallback;

                    _this.mouseHandler.leftClickCallback = () => {
                        oldLeftClick();
                        const arrow = _this.getArrowByMousePosition();
                        const isFree = _this.arrowActions.isFreeCursor();
                        const isShift = _this.keyboardHandler.getShiftPressed();

                        if (!arrow || !isFree || isShift) return;

                        const isButton =
                            arrow.type === ArrowType.BUTTON ||
                            arrow.type === ArrowType.DIRECTIONAL_BUTTON;

                        if (isButton && arrow.astIndex != null) {
                            const engine = _this.game.gameMap.graph.engine;
                            const signal =
                                arrow.signal !== 0
                                    ? NodeSignal.ACTIVE
                                    : NodeSignal.NONE;
                            engine.setNodeSignal(arrow.astIndex, signal);
                        }
                    };
                }

                private setupKeyInterception(): void {
                    const _this = this as any as PrivatePlayerControls;
                    const oldKeyDown = _this.keyboardHandler.onKeyDown;

                    _this.keyboardHandler.onKeyDown = (
                        code: string,
                        key: string,
                    ) => {
                        if (
                            code === 'Enter' ||
                            code === 'NumpadEnter' ||
                            code === 'KeyZ' ||
                            code === 'KeyY'
                        ) {
                            return;
                        }
                        oldKeyDown?.(code, key);
                    };
                }

                private stepRewind(): void {
                    const _this = this as any as PrivatePlayerControls;
                    if (!_this.playerAccess.canRunOneTick) return;
                    const engine = _this.game.gameMap.graph.engine;
                    const tick = engine.getTick();
                    if (tick === 0) return;
                    if (_this.game.playing) this.setPause(true);
                    engine.rewindToTick(tick - 1);
                    _this.playerUI.updateFpsDisplay();
                }

                private stepForward(): void {
                    const _this = this as any as PrivatePlayerControls;
                    if (_this.game.playing) this.setPause(true);
                    if (!_this.playerAccess.canRunOneTick) return;
                    _this.game.updateTick();
                }

                private pauseUndo(): void {
                    const _this = this as any as PrivatePlayerControls;
                    if (!_this.playerAccess.canUndo) return;
                    if (_this.history === null) return;
                    if (!_this.history.canUndo()) return;
                    const currentState = _this.history.getCurrentState();
                    _this.game.undoChanges(currentState);
                    _this.game.screenUpdated = true;
                    _this.history.undo();
                    if (_this.game.playing) this.setPause(true);
                }

                private pauseRedo(): void {
                    const _this = this as any as PrivatePlayerControls;
                    if (!_this.playerAccess.canUndo) return;
                    if (_this.history === null) return;
                    if (!_this.history.canRedo()) return;
                    _this.history.redo();
                    const currentState = _this.history.getCurrentState();
                    _this.game.redoChanges(currentState);
                    _this.game.screenUpdated = true;
                    if (_this.game.playing) this.setPause(true);
                }

                private selectAll(): void {
                    const _this = this as any as PrivatePlayerControls;
                    for (const chunk of _this.game.gameMap.chunks.values()) {
                        for (let x = 0; x < CHUNK_SIZE; x++) {
                            for (let y = 0; y < CHUNK_SIZE; y++) {
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
                }

                public clearSignals(): void {
                    // @ts-expect-error
                    super.clearSignals();
                    (
                        this as any as PrivatePlayerControls
                    ).playerUI.startTickFrom = 0;
                }

                public update(): void {
                    const _this = this as any as PrivatePlayerControls;
                    const kb = _this.keyboardHandler;

                    const isEnter =
                        kb.getKeyPressed('Enter') ||
                        kb.getKeyPressed('NumpadEnter');
                    const isShift = kb.getShiftPressed();
                    const isZ = kb.getKeyPressed('KeyZ');
                    const isY = kb.getKeyPressed('KeyY');

                    const isRedo = isY || (isZ && isShift);
                    const isUndo = isZ && !isShift;

                    this._undoRepeater.update(isUndo, () => this.pauseUndo());
                    this._redoRepeater.update(isRedo, () => this.pauseRedo());

                    this._rewindRepeater.update(isEnter && isShift, () =>
                        this.stepRewind(),
                    );
                    this._stepForwardRepeater.update(isEnter && !isShift, () =>
                        this.stepForward(),
                    );

                    if (kb.getCtrlPressed() && kb.getKeyPressed('KeyA')) {
                        this.selectAll();
                        return;
                    }

                    super.update();
                }

                public setPause(state: boolean): void {
                    const _this = this as any as PrivatePlayerControls;
                    _this.game.playing = !state;
                    _this.playerUI.pauseSign.setVisibility(state);
                    if (PLATFORM === 'mobile' && state) {
                        _this.playerUI.speedController?.setValue(0);
                    }
                }

                public override dispose(): void {
                    this._isDisposed = true;
                    this._cleanupMouseNavigation();
                    super.dispose();
                }
            };
        },
    );
};
