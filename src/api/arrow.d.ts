import {GraphNode} from "../graph_compiler/graph_node";
import {ASTNode} from "../graph_compiler/ast/astNode";
import {ArrowType} from "./arrow_type";

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

    blocked?: number;
    graph_node?: GraphNode;
    ast_node?: ASTNode;
}