import type { GraphNode } from '../GraphNode';

export interface PathTarget {
    node: GraphNode;
    delay: number;
}

export interface GraphPath {
    index: number;
    sourceNode: GraphNode;
    nodes: GraphNode[];
    splitters: GraphNode[];
    targets: PathTarget[];
}

export interface NodePathInfo {
    ref: GraphPath;
    distanceFromSource: number;
    isSplitter: boolean;
}
