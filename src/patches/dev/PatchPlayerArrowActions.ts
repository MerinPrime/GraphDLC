import type { MouseHandler } from '@logic-arrows/controls/mouse-handler';
import type { Game } from '@logic-arrows/player/game';
import type { GameHistory } from '@logic-arrows/player/game-history';
import type { PlayerAccess } from '@logic-arrows/player/player-access';
import type { PlayerArrowActions } from '@logic-arrows/player/player-arrow-actions';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

export class SelectionOverlayText {
    private text: string;
    private element: HTMLDivElement | null = null;

    public constructor(text: string = '') {
        this.text = text;
    }

    public add(parent: HTMLElement): void {
        if (this.element !== null) return;

        this.element = document.createElement('div');
        this.element.innerText = this.text;
        parent.appendChild(this.element);

        this.element.style.position = 'absolute';
        this.element.style.userSelect = 'none';
        this.element.style.whiteSpace = 'nowrap';
        this.element.style.pointerEvents = 'none';
        this.element.style.fontFamily = 'Nunito';
        this.element.style.color = 'rgb(70, 100, 165)';
        this.element.style.fontSize = '15px';
        this.element.style.zIndex = '9999';
    }

    public setText(text: string): void {
        this.text = text;
        if (this.element !== null) {
            this.element.innerText = text;
        }
    }

    public setVisibility(state: boolean): void {
        if (this.element !== null) {
            this.element.hidden = !state;
        }
    }

    public setPosition(
        mouseX: number,
        mouseY: number,
        alignX: 'left' | 'right',
        alignY: 'top' | 'bottom' | 'center' = 'center',
        offsetX: number = 10,
        offsetY: number = offsetX,
    ): void {
        if (this.element === null) return;

        let left = 0;
        let top = 0;
        let translateX = 0;
        let translateY = 0;

        if (alignX === 'right') {
            left = mouseX + offsetX;
            translateX = 0;
            this.element.style.textAlign = 'left';
        } else {
            left = mouseX - offsetX;
            translateX = -100;
            this.element.style.textAlign = 'right';
        }

        if (alignY === 'top') {
            top = mouseY - offsetY;
            translateY = -100;
        } else if (alignY === 'bottom') {
            top = mouseY + offsetY;
            translateY = 0;
        } else {
            top = mouseY;
            translateY = -50;
        }

        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;

        this.element.style.transform = `translate(${translateX}%, ${translateY}%)`;
    }

    public remove(): void {
        if (this.element === null) return;
        this.element.remove();
        this.element = null;
    }
}

interface PrivatePlayerArrowActions {
    game: Game;
}

export const PatchPlayerArrowActions: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    const mouseHandler = patchLoader.getInstance<MouseHandler>('MouseHandler');

    patchLoader.addDefinitionPatch(
        'PlayerArrowActions',
        (_module: typeof PlayerArrowActions) => {
            return class PlayerArrowActions extends _module {
                private selectionSizeTip: SelectionOverlayText;

                public constructor(
                    game: Game,
                    playerUI: PlayerUI,
                    history: GameHistory | null,
                    getPlayerAccess: () => PlayerAccess,
                ) {
                    super(game, playerUI, history, getPlayerAccess);
                    this.selectionSizeTip = new SelectionOverlayText('');
                    this.selectionSizeTip.add(
                        (game as any).render.canvas.parentElement,
                    );
                }

                public getSelectionInfo(): {
                    sizeX: number;
                    sizeY: number;
                    count: number;
                } {
                    const _this = this as any as PrivatePlayerArrowActions;
                    const selectedArrows =
                        _this.game.selectedMap.getSelectedArrows();
                    if (selectedArrows.length === 0)
                        return {
                            sizeX: 0,
                            sizeY: 0,
                            count: 0,
                        };
                    const [minX, minY, maxX, maxY] = selectedArrows.reduce(
                        ([minX, minY, maxX, maxY], s) => {
                            const [x, y] = s.split(',').map(Number);
                            return [
                                Math.min(minX, x),
                                Math.min(minY, y),
                                Math.max(maxX, x),
                                Math.max(maxY, y),
                            ];
                        },
                        [Infinity, Infinity, -Infinity, -Infinity],
                    );
                    const sizeX = maxX - minX + 1;
                    const sizeY = maxY - minY + 1;
                    const count = selectedArrows.length;
                    return {
                        sizeX,
                        sizeY,
                        count,
                    };
                }

                public getSelectionTipCorner(): [
                    alignX: 'left' | 'right',
                    alignY: 'top' | 'bottom',
                ] {
                    const _this = this as any as PrivatePlayerArrowActions;
                    const selectionArea =
                        _this.game.selectedMap.getCurrentSelectedArea();
                    if (!selectionArea) return ['left', 'bottom'];
                    const [firstX, firstY, secondX, secondY] = selectionArea;

                    const alignX = firstX < secondX ? 'left' : 'right';
                    const alignY = firstY < secondY ? 'top' : 'bottom';

                    return [alignX, alignY];
                }

                public selectArrows(
                    mouseFloatX: number,
                    mouseFloatY: number,
                    shiftPressed: boolean,
                    ctrlPressed: boolean,
                ): void {
                    super.selectArrows(
                        mouseFloatX,
                        mouseFloatY,
                        shiftPressed,
                        ctrlPressed,
                    );
                    const mousePos = mouseHandler.val?.getMousePosition();
                    if (!mousePos) {
                        this.selectionSizeTip.setVisibility(false);
                    } else {
                        this.selectionSizeTip.setVisibility(true);
                        const { sizeX, sizeY, count } = this.getSelectionInfo();
                        const [alignX, alignY] = this.getSelectionTipCorner();
                        const text =
                            alignX === 'left'
                                ? `${count}, ${sizeX}x${sizeY}`
                                : `${sizeX}x${sizeY}, ${count}`;
                        this.selectionSizeTip.setText(text);
                        this.selectionSizeTip.setPosition(
                            mousePos[0],
                            mousePos[1],
                            alignX,
                            'top',
                            5,
                            5,
                        );
                    }
                }

                public hideSelectionTip(): void {
                    this.selectionSizeTip.setVisibility(false);
                }
            };
        },
    );
};
