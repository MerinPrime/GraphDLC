import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import { CycleHeadType, type RawCycle } from './CycleTypes';

export class RawNode {
    arrow: Arrow; // Remove arrow, change to type, rotation, flipped
    chunkIdx: number;

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
    cycleOffset: number;
    origCycleOffset: number;

    constructor(
        arrow: Arrow,
        index: number,
        chunkIdx: number,
        globalX: number,
        globalY: number,
        localX: number,
        localY: number,
    ) {
        this.arrow = arrow;
        this.chunkIdx = chunkIdx;

        this.index = index;
        this.globalX = globalX;
        this.globalY = globalY;
        this.localX = localX;
        this.localY = localY;
        this.valid = false;
        this.next = [];
        this.previous = [];
        this.detectedNode = null;

        this.isCycle = false;
        this.cycleRef = null;
        this.ioCycle = null;
        this.headType = CycleHeadType.NONE;
        this.cycleOffset = 0;
        this.origCycleOffset = 0;
    }

    // TODO: add setType, setRotation, setFlipped, setState(type, rotation, flipped)
    // Recalculate cycle only if changed edges or type

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
