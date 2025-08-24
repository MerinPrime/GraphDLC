import {ArrowType} from "../api/arrow_type";
import {LayersDLC} from "../core/layersDLC";
import {NodeSignal} from "../graph_compiler/graph/nodeSignal";

export function PatchPlayerControls(layersDLC: LayersDLC) {
    layersDLC.patchLoader.addDefinitionPatch("PlayerControls", function (module: any): any {
        layersDLC.patchLoader.setDefinition("PlayerControls", class PlayerControls extends module {
            constructor(...args: any[]) {
                super(...args);
                this.mouseHandler.leftClickCallback = () => {
                    const arrow = this.getArrowByMousePosition();
                    const shiftPressed = this.keyboardHandler.getShiftPressed();

                    if (!arrow || !this.freeCursor || shiftPressed) return;

                    const isTargetType = arrow.type === 21 || arrow.type === 24;
                    if (!isTargetType) return;

                    const hasCompiledGraph = layersDLC.graphState !== undefined;
                    const shouldSetSignal = arrow.signal === 0 || this.game.playing;

                    if (shouldSetSignal) {
                        if (arrow.type === ArrowType.BUTTON) {
                            if (hasCompiledGraph) {
                                layersDLC.graphState!.signals[arrow.astIndex] = NodeSignal.ACTIVE;
                                layersDLC.graphState!.changedNodes.add(arrow.astIndex);
                            } else {
                                arrow.signal = 5;
                            }
                        } else {
                            if (hasCompiledGraph) {
                                layersDLC.graphState!.signals[arrow.astIndex] = NodeSignal.ACTIVE;
                                layersDLC.graphState!.changedNodes.add(arrow.astIndex);
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
                        layersDLC.compileGraph();
                    }
                };
            }
        });
    });
}