import {ArrowType} from "../api/arrowType";
import {GraphDLC} from "../core/graphDLC";
import {NodeSignal} from "../graph/nodeSignal";
import {PlayerControlsProto} from "../api/playerControls";
import {Game} from "../api/game";
import {PlayerUI} from "../api/playerUI";

export function PatchPlayerControls(graphDLC: GraphDLC) {
    const patchLoader = graphDLC.patchLoader;
    
    patchLoader.addDefinitionPatch("PlayerControls", function (module: PlayerControlsProto): any {
        patchLoader.setDefinition("PlayerControls", class PlayerControls_GDLC extends module {
            constructor(container: HTMLElement, game: Game, playerUI: PlayerUI, history?: History | null) {
                super(container, game, playerUI, history);

                document.addEventListener('mousedown', () => {
                    graphDLC.customUI.customTPSField?.blur();
                });
                this.mouseHandler.leftClickCallback = () => {
                    const arrow = this.getArrowByMousePosition();
                    const shiftPressed = this.keyboardHandler.getShiftPressed();

                    if (!arrow || !this.freeCursor || shiftPressed) return;

                    const isTargetType = arrow.type === ArrowType.BUTTON || arrow.type === ArrowType.DIRECTIONAL_BUTTON;
                    if (!isTargetType) return;
                    
                    const graphState = graphDLC.graphState;
                    const astIndex = arrow.astIndex;
                    const hasCompiledGraph = graphState !== undefined && astIndex !== undefined;
                    
                    const shouldSetSignal = (hasCompiledGraph ? graphState.signals[astIndex] === NodeSignal.NONE : arrow.signal === 0) || this.game.playing;

                    if (shouldSetSignal) {
                        if (arrow.type === ArrowType.BUTTON) {
                            if (hasCompiledGraph) {
                                graphState.signals[astIndex] = NodeSignal.ACTIVE;
                                graphState.changedNodes.add(astIndex);
                            } else {
                                arrow.signal = 5;
                            }
                        } else {
                            if (hasCompiledGraph) {
                                graphState.signals[astIndex] = NodeSignal.ACTIVE;
                                graphState.changedNodes.add(astIndex);
                            } else {
                                arrow.signal = 5;
                            }
                        }
                    } else {
                        if (hasCompiledGraph) {
                            graphState.signals[astIndex] = NodeSignal.NONE;
                            graphState.changedNodes.add(astIndex);
                            graphState.tempChangedNodes.add(astIndex);
                        } else {
                            arrow.signal = 0;
                        }
                    }

                    this.game.screenUpdated = true;
                };
                const prevKeyDownCallback = this.keyboardHandler.keyDownCallback;
                this.keyboardHandler.keyDownCallback = (code: string, key: number) => {
                    if (graphDLC.customUI.customTPSField && graphDLC.customUI.customTPSField.isFocused()) {
                        if (code.startsWith('Digit') || code.startsWith('Arrow') || code === 'Backspace' || code === 'Delete') {
                            return;
                        }
                        graphDLC.customUI.customTPSField.blur();
                    }
                    prevKeyDownCallback(code, key);
                    if (code === 'KeyP') {
                        graphDLC.compileGraph();
                    }
                };
            }
        });
    });
}
