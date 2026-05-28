import {GraphNode} from "../graph_compiler/graph_node";
import {ASTNode} from "../ast/astNode";
import {ArrowType} from "./arrowType";
import {SignalWrapper} from "../graph/signalWrapper";
import { ArrowSignal } from "./arrowSignal";

export interface Arrow {
    type: ArrowType;
    rotation: number;
    flipped: boolean;
    signal: SignalWrapper | ArrowSignal;
    signalsCount: number;
    
    lastType: ArrowType;
    lastRotation: number;
    lastFlipped: boolean;
    lastSignal: ArrowSignal;
    
    canBeEdited: boolean;

    // Graph-DLC
    astIndex?: number;
    cycleID?: number;
    cycleIndex?: number;
    
    x?: number;
    y?: number;
}

export type ArrowProto = new () => Arrow;
