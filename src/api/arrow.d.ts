import {GraphNode} from "../graph_compiler/graph_node";
import {ASTNode} from "../ast/astNode";
import {ArrowType} from "./arrowType";

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
    
    canBeEdited: boolean;

    // Graph-DLC
    blocked?: number;
    graph_node?: GraphNode;
    astNode?: ASTNode;
    astIndex?: number;
    
    x?: number;
    y?: number;
}

export type ArrowProto = new () => Arrow;