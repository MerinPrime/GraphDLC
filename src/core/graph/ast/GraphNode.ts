import {
    CycleHeadType,
    type GraphCycle,
    type NodeCycleInfo,
} from 'src/core/graph/ast/cycle/types';
import { ArrowType } from 'src/core/utils/ArrowType';
import { NodeType, NodeTypes } from '../engines/core/NodeType';
import { NodeEdgeList } from './NodeEdgeList';

export class GraphNode {
    public readonly nodeIdx: number;
    public readonly chunkIdx: number;

    public readonly globalX: number;
    public readonly globalY: number;
    public readonly localX: number;
    public readonly localY: number;

    public readonly posHash: number;

    public readonly linksList = new NodeEdgeList();
    public readonly backLinksList = new NodeEdgeList();

    public arrowType: ArrowType = ArrowType.EMPTY;
    public type: NodeType = NodeType.EMPTY;
    public rotation: number = 0;
    public flipped: boolean = false;

    public detectedLink: GraphNode | null = null;
    public blockedLink: GraphNode | null = null;

    public isBreakpoint: boolean = false;
    public cycle: NodeCycleInfo | null = null;

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

        this.posHash = hashXY(globalX, globalY);
    }

    public setType(type: ArrowType) {
        this.arrowType = type;
        this.type = NodeTypes.fromArrowType(type);
    }

    public setRotation(rotation: number) {
        this.rotation = rotation;
    }

    public setFlipped(flipped: boolean) {
        this.flipped = flipped;
    }

    public updateState(type: ArrowType, rotation: number, flipped: boolean) {
        this.arrowType = type;
        this.type = NodeTypes.fromArrowType(type);
        this.rotation = rotation;
        this.flipped = flipped;
    }

    public addLink(target: GraphNode) {
        this.linksList.add(target);
        target.backLinksList.add(this);
    }

    public removeLink(target: GraphNode) {
        this.linksList.remove(target);
        target.backLinksList.remove(this);
    }

    public get links(): readonly GraphNode[] {
        return this.linksList.nodes;
    }

    public get backLinks(): readonly GraphNode[] {
        return this.backLinksList.nodes;
    }

    public get isCycle(): boolean {
        return this.cycle?.isBody ?? false;
    }

    public get cycleRef(): GraphCycle | null {
        return this.cycle?.ref ?? null;
    }

    public get headType(): CycleHeadType {
        return this.cycle?.headType ?? CycleHeadType.NONE;
    }

    public get cycleOffset(): number {
        return this.cycle?.offset ?? 0;
    }
}

function hashXY(x: number, y: number): number {
    let h = Math.imul(x, 0x9e3779b1);
    h ^= Math.imul(y, 0x85ebca6b);

    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;

    return h >>> 0;
}
