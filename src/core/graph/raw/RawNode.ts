import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import { CycleHeadType, type RawCycle } from './CycleTypes';

export class RawNode {
    arrow: Arrow;
    chunk: Chunk;
    // Add chunkidx ( in future that will help with markRenderDirty )
    index: number;
    globalX: number;
    globalY: number;
    localX: number;
    localY: number;
    valid: boolean;

    next: RawNode[];
    previous: RawNode[];
    detectedNode: RawNode | null;

    isCycle: boolean;
    cycleRef: RawCycle | null;
    ioCycle: RawCycle | null;
    headType: CycleHeadType;

    constructor(
        arrow: Arrow,
        index: number,
        chunk: Chunk,
        globalX: number,
        globalY: number,
    ) {
        this.arrow = arrow;
        this.chunk = chunk;
        this.index = index;
        this.globalX = globalX;
        this.globalY = globalY;
        this.localX = globalX - chunk.x * CHUNK_SIZE;
        this.localY = globalY - chunk.y * CHUNK_SIZE;
        this.valid = false;
        this.next = [];
        this.previous = [];
        this.detectedNode = null;

        this.isCycle = false;
        this.cycleRef = null;
        this.ioCycle = null;
        this.headType = CycleHeadType.NONE;
    }

    addNext(node: RawNode) {
        this.next.push(node);
        node.previous.push(this);
    }

    removeNext(node: RawNode) {
        removeWithSwap(this.next, node);
        removeWithSwap(node.previous, this);
    }

    clearNext(): { oldNext: RawNode[]; detectors: RawNode[] } {
        const oldNext = [...this.next];
        const detectors: RawNode[] = [];

        for (const nextNode of oldNext) {
            removeWithSwap(nextNode.previous, this);
            if (nextNode.detectedNode === this) detectors.push(nextNode);
        }
        this.next.length = 0;
        return { oldNext, detectors };
    }
}
