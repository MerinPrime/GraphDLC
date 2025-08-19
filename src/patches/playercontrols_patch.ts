import {ArrowType} from "../api/arrow_type";
import {LayersDLC} from "../core/layersdlc";

export function PatchPlayerControls(layersdlc: LayersDLC) {
    layersdlc.patchLoader.addDefinitionPatch("PlayerControls", function (module: any): any {
        layersdlc.patchLoader.setDefinition("PlayerControls", class PlayerControls extends module {
            constructor(...args: any[]) {
                super(...args);
                this.mouseHandler.leftClickCallback = () => {
                    const arrow = this.getArrowByMousePosition();
                    const shiftPressed = this.keyboardHandler.getShiftPressed();

                    if (!arrow || !this.freeCursor || shiftPressed) return;

                    const isTargetType = arrow.type === 21 || arrow.type === 24;
                    if (!isTargetType) return;

                    const hasCompiledGraph = layersdlc.graph !== undefined;
                    const shouldSetSignal = arrow.signal === 0 || this.game.playing;

                    if (shouldSetSignal) {
                        if (arrow.type === ArrowType.BUTTON) {
                            arrow.signal = 5;
                            if (hasCompiledGraph) {
                                layersdlc.graph!.changed_nodes.add(arrow.graph_node);
                            }
                        } else {
                            if (hasCompiledGraph) {
                                const buttonEdge = arrow.graph_node.buttonEdge;
                                if (!buttonEdge) {
                                    arrow.signal = 5;
                                    layersdlc.graph!.changed_nodes.add(arrow.graph_node);
                                } else {
                                    buttonEdge.arrow.signal = buttonEdge.handler.active_signal;
                                    buttonEdge.lastSignal = 0;
                                    layersdlc.graph!.changed_nodes.add(buttonEdge);
                                    layersdlc.graph!.delayed_update.add(buttonEdge);
                                }
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
                        layersdlc.compileGraph();
                    }
                };
            }
        });
    });
}