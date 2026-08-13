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
}
