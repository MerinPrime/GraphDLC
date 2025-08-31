import { GraphDLC } from "../core/graphdlc";
import {RenderProto} from "../api/render";
import {SignalWrapper} from "../graph/signalWrapper";
import {Game} from "../api/game";
import {NodeSignal} from "../graph/nodeSignal";
import {ACTIVE_SIGNALS} from "../graph/signals";

export function PatchRender(graphDLC: GraphDLC) {
    const patchLoader = graphDLC.patchLoader;
    const settings = graphDLC.settings;

    patchLoader.addDefinitionPatch("Render", function (module: RenderProto): any {
        patchLoader.setDefinition("Render", class Render extends module {
            drawArrow(x: number, y: number, type: number,
                      signal: number | SignalWrapper, rotation: number, flipped: boolean): void {
                if (typeof signal !== "number") {
                    const graphState = graphDLC.graphState;
                    const game = this.game;
                    const signalWrapper = signal as SignalWrapper;
                    signal = 0;
                    
                    if (graphState && game !== undefined) {
                        const astIndex = signalWrapper.astIndex;
                        if (astIndex !== undefined) {
                            signal = graphState.signals[astIndex];
                        } else if (!game.playing || settings.data.fullRendering) {
                            const cycleID = signalWrapper.cycleID;
                            const cycleIndex = signalWrapper.cycleIndex;
                            if (cycleID !== undefined && cycleIndex !== undefined) {
                                const cycleLength = graphState.cycleLengths[cycleID];
                                const cycleOffset = graphState.cycleOffsets[cycleID];
                                const position = (game.tick + cycleIndex) % cycleLength;
                                const offset = position & 31;
                                const wordIndex = cycleOffset + (position >>> 5);
                                const mask = 1 << offset;
                                signal = (graphState.cycleStates[wordIndex] & mask) !== 0 ? NodeSignal.ACTIVE : NodeSignal.NONE;
                            }
                        }
                        
                        if (signal === NodeSignal.ACTIVE) {
                            signal = ACTIVE_SIGNALS[type];
                        }
                    }
                }
                super.drawArrow(x,y, type, signal, rotation, flipped);
            }
        });
    });
}

