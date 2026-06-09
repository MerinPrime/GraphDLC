import type { Arrow } from '@logic-arrows/game-logic/arrow';
import { ArrowType } from 'src/core/utils/ArrowType';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import { CycleHeadType, type RawCycle } from './CycleTypes';

export class RawNode {
    public readonly arrow: Arrow;
    public readonly nodeIdx: number;
    public readonly chunkIdx: number;

    public type: ArrowType = ArrowType.EMPTY;
    public rotation: number = 0;
    public flipped: boolean = false;

    public readonly globalX: number;
    public readonly globalY: number;
    public readonly localX: number;
    public readonly localY: number;

    public valid: boolean = false;
    public next: RawNode[] = [];
    public previous: RawNode[] = [];
    public detectedNode: RawNode | null = null;

    public isCycle: boolean = false;
    public cycleRef: RawCycle | null = null;
    public ioCycle: RawCycle | null = null;
    public headType: CycleHeadType = CycleHeadType.NONE;
    public cycleOffset: number = 0;
    public origCycleOffset: number = 0;

    public constructor(
        arrow: Arrow,
        nodeIdx: number,
        chunkIdx: number,
        globalX: number,
        globalY: number,
        localX: number,
        localY: number,
    ) {
        this.arrow = arrow;
        this.nodeIdx = nodeIdx;
        this.chunkIdx = chunkIdx;

        this.globalX = globalX;
        this.globalY = globalY;
        this.localX = localX;
        this.localY = localY;
    }

    public setType(type: ArrowType) {
        this.type = type;
    }

    public setRotation(rotation: number) {
        this.rotation = rotation;
    }

    public setFlipped(flipped: boolean) {
        this.flipped = flipped;
    }

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
