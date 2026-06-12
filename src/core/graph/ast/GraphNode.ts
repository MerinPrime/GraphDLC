import { ArrowType } from 'src/core/utils/ArrowType';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import { CycleHeadType, type GraphCycle } from './CycleTypes';

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

    public links: GraphNode[] = [];
    public backLinks: GraphNode[] = [];
    public detectedLink: GraphNode | null = null;

    public isBreakpoint: boolean = false;

    public isCycle: boolean = false;
    public cycleRef: GraphCycle | null = null;
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

    public addLink(node: GraphNode) {
        this.links.push(node);
        node.backLinks.push(this);
        this.onUpdate();
        node.onUpdate();
    }

    public removeLink(node: GraphNode) {
        removeWithSwap(this.links, node);
        removeWithSwap(node.backLinks, this);
        this.onUpdate();
        node.onUpdate();
    }

    private onUpdate() {
        if (this.type === ArrowType.BLOCKER) {
            const isBreakpoint = this.links.some(
                (linkedNode) => linkedNode.type === ArrowType.BLOCKER,
            );
            this.isBreakpoint = isBreakpoint;
        } else {
            this.isBreakpoint = false;
        }
    }
}
