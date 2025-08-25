import {ArrowType} from "../api/arrowType";
import {GraphDLC} from "../core/graphdlc";
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
                
                this.mouseHandler.leftClickCallback = () => {
                    const arrow = this.getArrowByMousePosition();
                    const shiftPressed = this.keyboardHandler.getShiftPressed();

                    if (!arrow || !this.freeCursor || shiftPressed) return;

                    const isTargetType = arrow.type === 21 || arrow.type === 24;
                    if (!isTargetType) return;

                    const shouldSetSignal = arrow.signal === 0 || this.game.playing;
                    const graphState = graphDLC.graphState;
                    const astIndex = arrow.astIndex;
                    const hasCompiledGraph = graphState !== undefined && astIndex !== undefined;

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
                                // const buttonEdge = arrow.graph_node.buttonEdge;
                                // if (!buttonEdge) {
                                //     arrow.signal = 5;
                                //     layersDLC.graph!.changed_nodes.add(arrow.graph_node);
                                // } else {
                                //     buttonEdge.arrow.signal = buttonEdge.handler.active_signal;
                                //     buttonEdge.lastSignal = 0;
                                //     layersDLC.graph!.changed_nodes.add(buttonEdge);
                                //     layersDLC.graph!.delayed_update.add(buttonEdge);
                                // }
                            } else {
                                arrow.signal = 5;
                            }
                        }
                    } else {
                        arrow.signal = 0;
                    }

                    this.game.screenUpdated = true;
                };
                const prevKeyDownCallback = this.keyboardHandler.keyDownCallback;
                this.keyboardHandler.keyDownCallback = (code: string, key: number) => {
                    prevKeyDownCallback(code, key);
                    if (code === 'KeyP') {
                        graphDLC.compileGraph();
                    }
                };
            }
        });
    });
}