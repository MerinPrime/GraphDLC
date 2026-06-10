import { ArrowType } from 'src/core/utils/ArrowType';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import { CycleHeadType, type RawCycle } from './CycleTypes';

export class GraphNode {
    public readonly nodeIdx: number;
    public readonly chunkIdx: number;

    public type: ArrowType = ArrowType.EMPTY;
    public rotation: number = 0;
    public flipped: boolean = false;

    public readonly globalX: number;
    public readonly globalY: number;
    public readonly localX: number;
    public readonly localY: number;

    public next: GraphNode[] = [];
    public previous: GraphNode[] = [];
    public detectedNode: GraphNode | null = null;

    public isBreakpoint: boolean = false;

    public isCycle: boolean = false;
    public cycleRef: RawCycle | null = null;
    public ioCycle: RawCycle | null = null;
    public headType: CycleHeadType = CycleHeadType.NONE;
    public cycleOffset: number = 0;
    public origCycleOffset: number = 0;

    public constructor(
        nodeIdx: number,
        chunkIdx: number,
        globalX: number,
        globalY: number,
        localX: number,
        localY: number,
    ) {
        this.nodeIdx = nodeIdx;
        this.chunkIdx = chunkIdx;

        this.globalX = globalX;
        this.globalY = globalY;
        this.localX = localX;
        this.localY = localY;
    }

    public setType(type: ArrowType) {
        this.type = type;
        this.onUpdate();
    }

    public setRotation(rotation: number) {
        this.rotation = rotation;
        this.onUpdate();
    }

    public setFlipped(flipped: boolean) {
        this.flipped = flipped;
        this.onUpdate();
    }

    public addNext(node: GraphNode) {
        this.next.push(node);
        node.previous.push(this);
        this.onUpdate();
        node.onUpdate();
    }

    public removeNext(node: GraphNode) {
        removeWithSwap(this.next, node);
        removeWithSwap(node.previous, this);
        this.onUpdate();
        node.onUpdate();
    }

    public clearNext(): { oldNext: GraphNode[]; detectors: GraphNode[] } {
        const oldNext = [...this.next];
        const detectors: GraphNode[] = [];

        for (const nextNode of oldNext) {
            removeWithSwap(nextNode.previous, this);
            if (nextNode.detectedNode === this) detectors.push(nextNode);
        }
        this.next.length = 0;
        for (const nextNode of oldNext) {
            nextNode.onUpdate();
        }
        this.onUpdate();
        return { oldNext, detectors };
    }

    private onUpdate() {
        if (this.type === ArrowType.BLOCKER) {
            const isBlockedBlocker = this.next.some(
                (nextNode) => nextNode.type === ArrowType.BLOCKER,
            );
            this.isBreakpoint = isBlockedBlocker;
        } else {
            this.isBreakpoint = false;
        }
    }
}
