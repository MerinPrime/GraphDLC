import {GraphState} from "./graphState";
import {NodeSignal} from "./nodeSignal";
import {
    ANDTypeIndex,
    BlockerTypeIndex,
    ButtonTypeIndex,
    DelayTypeIndex,
    DetectorTypeIndex,
    DirectionalButtonTypeIndex, FlipFlopTypeIndex,
    ImpulseTypeIndex, LatchTypeIndex,
    NOTTypeIndex,
    PathTypeIndex,
    RandomTypeIndex,
    SourceTypeIndex,
    XORTypeIndex
} from "../ast/astNodeType";


export class GraphUpdater {
    updateState(graphState: GraphState, tick: number) {
        graphState.tempChangedNodes.count = 0;

        for (let i = 0; i < graphState.changedNodes.count; i++) {
            const nodeID = graphState.changedNodes.arr[i];
            const signal = graphState.signals[nodeID];
            const isChanged = graphState.lastSignals[nodeID] !== signal;
            const type: number = graphState.types[nodeID];
            const flags = graphState.flags[nodeID];
            
            if (isChanged) {
                // If delay blocked and is pending he is make delta -1 and overflow makes 255 signalsCount
                // Fix that
                const isActive = signal === NodeSignal.ACTIVE;
                const delta = isActive ? 1 : -1;
                const isDelayed = type === DelayTypeIndex && signal === NodeSignal.PENDING || !isActive && graphState.lastSignals[nodeID] === NodeSignal.PENDING;
                
                const edgesCount = graphState.edgesCount[nodeID];
                const detectorsCount = graphState.detectorsCount[nodeID];
                
                let edgesPointer = graphState.edgesPosition[nodeID];
                let lastEdgesPointer = edgesPointer + edgesCount;
                
                if (!isDelayed) {
                    if (edgesCount > 0) {
                        // BLOCK FIRST EDGE BUT DONT BLOCK OTHER BECAUSE DETECTORS MAY BE OPTIMIZED TO PATH
                        if (type === BlockerTypeIndex) {
                            const edge = graphState.edges[edgesPointer++];
                            graphState.blockedCount[edge] += delta;

                            const flags = graphState.flags[edge];
                            if ((flags & 0b1000) === 0) {
                                graphState.flags[edge] = flags | 0b1000;
                                graphState.tempChangedNodes.add(edge);
                            }
                        }
                        for (; edgesPointer < lastEdgesPointer; edgesPointer++) {
                            const edge = graphState.edges[edgesPointer];
                            graphState.signalsCount[edge] += delta;

                            const flags = graphState.flags[edge];
                            if ((flags & 0b1000) === 0) {
                                graphState.flags[edge] = flags | 0b1000;
                                graphState.tempChangedNodes.add(edge);
                            }
                        }
                    }
                }
                else {
                    edgesPointer += edgesCount;
                }

                lastEdgesPointer += detectorsCount;
                for (; edgesPointer < lastEdgesPointer; edgesPointer++) {
                    const detector = graphState.edges[edgesPointer];
                    graphState.signalsCount[detector] = signal !== NodeSignal.NONE ? 1 : 0;

                    const flags = graphState.flags[detector];
                    if ((flags & 0b1000) === 0) {
                        graphState.flags[detector] = flags | 0b1000;
                        graphState.tempChangedNodes.add(detector);
                    }
                }

                graphState.lastSignals[nodeID] = graphState.signals[nodeID];
            }
            
            if ((isChanged && (flags & 0b10) !== 0) ||
                (tick === 0 && (flags & 0b1) !== 0) ||
                (signal !== NodeSignal.NONE && graphState.signalsCount[nodeID] === 0 && (type === ButtonTypeIndex || type === DirectionalButtonTypeIndex)) ||
                (graphState.signalsCount[nodeID] > 0 && (type === RandomTypeIndex || type === ANDTypeIndex && (flags & 0b100) !== 0))) {
                if ((flags & 0b1000) === 0) {
                    graphState.flags[nodeID] = flags | 0b1000;
                    graphState.tempChangedNodes.add(nodeID);
                }
            }
        }
        
        const temp = graphState.changedNodes;
        graphState.changedNodes = graphState.tempChangedNodes;
        graphState.tempChangedNodes = temp;

        for (let i = 0; i < graphState.changedNodes.count; i++) {
            const nodeID = graphState.changedNodes.arr[i];
            const type = graphState.types[nodeID];
            const blockedCount = graphState.blockedCount[nodeID];
            const flags = graphState.flags[nodeID];
            graphState.flags[nodeID] = flags & 0b0111
            
            if (blockedCount > 0)
                graphState.signals[nodeID] = NodeSignal.NONE;
            else {
                const signalCount = graphState.signalsCount[nodeID];
                const signal = updateNode(graphState, nodeID, type, signalCount);
                if (signal !== NodeSignal.KEEP_SIGNAL)
                    graphState.signals[nodeID] = signal;
            }
        }
    }
    
    resetGraph(graphState: GraphState) {
        graphState.changedNodes.arr.set(graphState.entryPoints);
        graphState.changedNodes.count = graphState.entryPoints.length;
        graphState.signals.fill(NodeSignal.NONE);
        graphState.lastSignals.fill(NodeSignal.NONE);
        graphState.signalsCount.fill(0);
        graphState.blockedCount.fill(0);
        for (let i = 0; i < graphState.flags.length; i++) {
            graphState.flags[i] &= 0b11110111
        }
    }
}

function updateNode(graphState: GraphState, nodeID: number, type: number, signalsCount: number): number {
    let signal: number = 0;
    switch (type) {
        case PathTypeIndex:
        case BlockerTypeIndex:
        case DetectorTypeIndex:
        case DirectionalButtonTypeIndex:
            return signalsCount > 0 ? NodeSignal.ACTIVE : NodeSignal.NONE;
        case SourceTypeIndex:
            return NodeSignal.ACTIVE;
        case DelayTypeIndex:
            signal = graphState.signals[nodeID];
            if (signal === NodeSignal.PENDING) {
                return NodeSignal.ACTIVE;
            } else if (signalsCount > 0) {
                if (signal === NodeSignal.NONE) {
                    return NodeSignal.PENDING;
                }
            } else {
                return NodeSignal.NONE;
            }
            return NodeSignal.KEEP_SIGNAL;
        case ImpulseTypeIndex:
            signal = graphState.signals[nodeID];
            if (signal === NodeSignal.NONE)
                return NodeSignal.ACTIVE;
            return NodeSignal.PENDING;
        case NOTTypeIndex:
            return signalsCount === 0 ? NodeSignal.ACTIVE : NodeSignal.NONE;
        case ANDTypeIndex:
            return signalsCount > 1 ? NodeSignal.ACTIVE : NodeSignal.NONE;
            // if (graphNode.cycleHeadType === CycleHeadType.READ) {
            //     if (arrow.signalsCount > 1) {
            //         arrow.signal = 3;
            //     } else if (arrow.signalsCount === 0) {
            //         arrow.signal = 0;
            //     } else {
            //         arrow.signal = graphNode.newCycle!.data.read(currentTick + graphNode.cycleOffset) ? 3 : 0;
            //     }
            // } else {
            //     arrow.signal = arrow.signalsCount > 1 ? 3 : 0;
            // }
        case XORTypeIndex:
            return signalsCount % 2 === 1 ? NodeSignal.ACTIVE : NodeSignal.NONE;
        case LatchTypeIndex:
            if (signalsCount > 1)
                return NodeSignal.ACTIVE;
            else if (signalsCount === 1)
                return NodeSignal.NONE;
            return NodeSignal.KEEP_SIGNAL;
        case FlipFlopTypeIndex:
            if (signalsCount > 0) {
                signal = graphState.signals[nodeID];
                if (signal === NodeSignal.ACTIVE) {
                    return NodeSignal.NONE;
                } else {
                    return NodeSignal.ACTIVE;
                }
            }
            return NodeSignal.KEEP_SIGNAL;
        case RandomTypeIndex:
            return signalsCount > 0 && Math.random() > 0.5 ? NodeSignal.ACTIVE : NodeSignal.NONE;
        case ButtonTypeIndex:
            return NodeSignal.NONE;
        default:
            return NodeSignal.KEEP_SIGNAL;
    }
}