import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import { CycleHeadType, type RawCycle } from './CycleTypes';

export class RawNode {
    public readonly arrow: Arrow; // Remove arrow, change to type, rotation, flipped
    public readonly chunkIdx: number;

    public readonly index: number;
    public readonly globalX: number;
    public readonly globalY: number;
    public readonly localX: number;
    public readonly localY: number;
    public valid: boolean;

    public next: RawNode[];
    public previous: RawNode[];
    public detectedNode: RawNode | null;

    public isCycle: boolean;
    public cycleRef: RawCycle | null;
    public ioCycle: RawCycle | null;
    public headType: CycleHeadType;
    public cycleOffset: number;
    public origCycleOffset: number;

    public constructor(
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

    public addNext(node: RawNode) {
        this.next.push(node);
        node.previous.push(this);
    }

    public removeNext(node: RawNode) {
        removeWithSwap(this.next, node);
        removeWithSwap(node.previous, this);
    }

    public clearNext(): { oldNext: RawNode[]; detectors: RawNode[] } {
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
