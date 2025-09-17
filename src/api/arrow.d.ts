import {GraphNode} from "../graph_compiler/graph_node";
import {ASTNode} from "../ast/astNode";
import {ArrowType} from "./arrowType";
import {SignalWrapper} from "../graph/signalWrapper";

export interface Arrow {
    type: ArrowType;
    rotation: number;
    flipped: boolean;
    signal: SignalWrapper | number;
    signalsCount: number;
    
    lastType: ArrowType;
    lastRotation: number;
    lastFlipped: boolean;
    lastSignal: number;
    
    canBeEdited: boolean;

    // Graph-DLC
    astIndex?: number;
    cycleID?: number;
    cycleIndex?: number;
    
    x?: number;
    y?: number;
}

export type ArrowProto = new () => Arrow;
