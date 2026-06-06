import type { RawNode } from './RawNode';

export const enum CycleHeadType {
    READ = 0,
    WRITE = 1,
    CLEAR = 2,
    XOR_WRITE = 3,
}

export interface RawCycle {
    nodes: RawNode[];
    heads: RawNode[];
}
