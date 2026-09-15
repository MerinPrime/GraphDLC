import type { GraphNode } from '../GraphNode';

export const enum CycleHeadType {
    NONE = 0,
    READ = 1,
    WRITE = 2,
    CLEAR = 3,
    XOR_WRITE = 4,
}

export interface GraphCycle {
    index: number;
    nodes: GraphNode[];
    heads: GraphNode[];
    extraNodes: GraphNode[];
}

export interface ReadHead {
    node: GraphNode;
    extraPath: GraphNode[];
    distance: number;
}

export interface InternalCycle {
    key: string;
    nodes: GraphNode[];
    graphCycleRef: GraphCycle | null;
    valid: boolean;
}
