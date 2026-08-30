import {
    CycleHeadType,
    type GraphCycle,
} from 'src/core/graph/ast/cycle/CycleTypes';
import { ArrowType } from 'src/core/utils/ArrowType';
import { NodeType, NodeTypes } from '../engines/core/NodeType';

export class GraphNode {
    public readonly nodeIdx: number;
    public readonly chunkIdx: number;

    public arrowType: ArrowType = ArrowType.EMPTY;
    public type: NodeType = NodeType.EMPTY;
    public rotation: number = 0;
    public flipped: boolean = false;

    public readonly globalX: number;
    public readonly globalY: number;
    public readonly localX: number;
    public readonly localY: number;

    public links: GraphNode[] = [];
    public linkCounts: number[] = [];

    public backLinks: GraphNode[] = [];
    public backLinkCounts: number[] = [];

    public detectedLink: GraphNode | null = null;
    public blockedLink: GraphNode | null = null;

    public isBreakpoint: boolean = false;

    public isCycle: boolean = false;
    public cycleRef: GraphCycle | null = null;
    public headType: CycleHeadType = CycleHeadType.NONE;
    public cycleOffset: number = 0;

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
        this.arrowType = type;
        this.type = NodeTypes.fromArrowType(type);
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
        const idx = this.links.indexOf(node);
        if (idx !== -1) {
            this.linkCounts[idx]++;
        } else {
            this.links.push(node);
            this.linkCounts.push(1);
        }

        const bIdx = node.backLinks.indexOf(this);
        if (bIdx !== -1) {
            node.backLinkCounts[bIdx]++;
        } else {
            node.backLinks.push(this);
            node.backLinkCounts.push(1);
        }

        this.onUpdate();
        node.onUpdate();
    }

    public removeLink(node: GraphNode) {
        const idx = this.links.indexOf(node);
        if (idx !== -1) {
            this.linkCounts[idx]--;
            if (this.linkCounts[idx] === 0) {
                const last = this.links.length - 1;
                this.links[idx] = this.links[last];
                this.linkCounts[idx] = this.linkCounts[last];
                this.links.pop();
                this.linkCounts.pop();
            }
        }

        const bIdx = node.backLinks.indexOf(this);
        if (bIdx !== -1) {
            node.backLinkCounts[bIdx]--;
            if (node.backLinkCounts[bIdx] === 0) {
                const last = node.backLinks.length - 1;
                node.backLinks[bIdx] = node.backLinks[last];
                node.backLinkCounts[bIdx] = node.backLinkCounts[last];
                node.backLinks.pop();
                node.backLinkCounts.pop();
            }
        }

        this.onUpdate();
        node.onUpdate();
    }

    private onUpdate() {
        if (this.type === NodeType.BLOCKER) {
            const isBreakpoint =
                this.blockedLink?.type === NodeType.BLOCKER &&
                this.blockedLink?.blockedLink === this;
            this.isBreakpoint = isBreakpoint;
        } else {
            this.isBreakpoint = false;
        }
    }
}
