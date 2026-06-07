import type { RawNode } from './RawNode';

export const enum CycleHeadType {
    NONE = 0,
    READ = 1,
    WRITE = 2,
    CLEAR = 3,
    XOR_WRITE = 4,
}

export interface RawCycle {
    index: number;
    nodes: RawNode[];
    heads: RawNode[];
}
