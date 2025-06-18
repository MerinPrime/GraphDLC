import {GraphNode} from "../graph_compiler/graph_node";

export interface Arrow {
    type: ArrowType;
    rotation: number;
    flipped: boolean;
    signal: number;
    signalsCount: number;
    
    lastType: ArrowType;
    lastRotation: number;
    lastFlipped: boolean;
    lastSignal: number;

    detectorSignal: number;
    blocked: number;
    pending: boolean;
    graph_node?: GraphNode;
}