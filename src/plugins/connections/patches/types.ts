import type { GraphNode } from 'src/core/graph/ast/GraphNode';

export interface HighlightPathData {
    node: GraphNode;
    path: GraphNode[];
    input: GraphNode[];
    output: GraphNode[];
}
