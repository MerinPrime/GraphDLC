import type { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import type { ITask } from 'src/core/task/ITask';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeType, NodeTypes } from '../../engines/core/NodeType';
import { DebuggerMode } from '../DebuggerMode';
import type { DebugColor, INodeDebugData } from '../types';

export interface DeadNodeDebugData extends INodeDebugData {
    isUnoptimized: boolean;
    isReachable: boolean;
}

const DEBUG_COLORS = {
    OFF: [0, 0, 0, 0] as DebugColor,
    DEAD: [0, 0, 0, 0.3] as DebugColor,
    UNOPTIMIZED: [0.6, 0.1, 0.8, 0.4] as DebugColor,
} as const;

function getPatternKey(points: readonly [number, number][]): string {
    const sorted = points
        .slice()
        .sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]));
    let key = '';
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0) key += '|';
        key += `${sorted[i][0]},${sorted[i][1]}`;
    }
    return key;
}

const MATCH_PATTERNS = new Set<string>();
const ROTATIONS = [0, 1, 2, 3];
const FLIPPED_STATES = [false, true];

for (let i = 0; i < NodeTypes.PATH_TYPES.length; i++) {
    const checkType = NodeTypes.PATH_TYPES[i];
    const relations = getArrowRelations(checkType);

    for (let r = 0; r < ROTATIONS.length; r++) {
        const rot = ROTATIONS[r];
        for (let f = 0; f < FLIPPED_STATES.length; f++) {
            const flip = FLIPPED_STATES[f];
            const points: [number, number][] = [];

            for (let j = 0; j < relations.length; j++) {
                const [forward, sideways] = relations[j];
                const pos = getRelativePosition(
                    0,
                    0,
                    rot,
                    flip,
                    forward,
                    sideways,
                );
                points.push([pos.x, pos.y]);
            }

            MATCH_PATTERNS.add(getPatternKey(points));
        }
    }
}

class GlobalUpdateTask implements ITask<void> {
    public isCanceled = false;
    public stepBatchSize = 500;

    private phase = 0;

    private allNodes: readonly GraphNode[] = [];
    private nodeCount = 0;
    private maxIdx = 0;

    private isReachable: Uint8Array = new Uint8Array(0);
    private queue: GraphNode[] = [];

    private head = 0;
    private initIdx = 0;
    private applyIdx = 0;

    public constructor(
        private readonly graph: Graph,
        private readonly mode: DeadNodeDebuggerMode,
    ) {}

    public step(batchSize: number): boolean {
        if (this.isCanceled) return true;

        let budget = batchSize;

        while (budget > 0) {
            switch (this.phase) {
                case 0: {
                    this.allNodes = this.graph.getNodes();
                    this.nodeCount = this.allNodes.length;

                    if (this.nodeCount === 0) return true;

                    this.maxIdx = 0;
                    this.initIdx = 0;
                    this.applyIdx = 0;
                    this.head = 0;
                    this.queue = [];

                    this.phase = 1;
                    break;
                }

                case 1: {
                    const limit = Math.min(
                        this.initIdx + budget,
                        this.nodeCount,
                    );
                    const processed = limit - this.initIdx;
                    budget -= processed;

                    for (let i = this.initIdx; i < limit; i++) {
                        const node = this.allNodes[i];
                        if (node.nodeIdx > this.maxIdx) {
                            this.maxIdx = node.nodeIdx;
                        }

                        if (node.type === NodeType.EMPTY) continue;

                        if (
                            NodeTypes.isEntryPoint(node.type) &&
                            node.type !== NodeType.DETECTOR
                        ) {
                            this.queue.push(node);
                        }
                    }

                    this.initIdx = limit;
                    if (this.initIdx >= this.nodeCount) {
                        this.isReachable = new Uint8Array(this.maxIdx + 1);

                        for (let i = 0; i < this.queue.length; i++) {
                            this.isReachable[this.queue[i].nodeIdx] = 1;
                        }

                        this.phase = 2;
                    }
                    break;
                }

                case 2: {
                    while (this.head < this.queue.length && budget > 0) {
                        const current = this.queue[this.head++];
                        budget--;

                        const links = current.links;
                        const isBlocker = current.type === NodeType.BLOCKER;

                        for (let i = 0; i < links.length; i++) {
                            const child = links[i];

                            if (isBlocker && child === current.blockedLink) {
                                continue;
                            }

                            const childIdx = child.nodeIdx;

                            if (
                                child.type === NodeType.EMPTY ||
                                this.isReachable[childIdx] === 1
                            ) {
                                continue;
                            }

                            if (child.type === NodeType.DETECTOR) {
                                if (
                                    child.detectedLink === null ||
                                    this.isReachable[
                                        child.detectedLink.nodeIdx
                                    ] !== 1
                                ) {
                                    continue;
                                }
                            }

                            if (
                                child.type === NodeType.LOGIC_AND ||
                                child.type === NodeType.LATCH
                            ) {
                                let activeUniqueParents = 0;
                                const backLinks = child.backLinks;

                                for (let j = 0; j < backLinks.length; j++) {
                                    const parent = backLinks[j];
                                    if (
                                        parent.type !== NodeType.EMPTY &&
                                        parent.type !== NodeType.BLOCKER &&
                                        this.isReachable[parent.nodeIdx] === 1
                                    ) {
                                        activeUniqueParents++;
                                    }
                                }
                                if (activeUniqueParents >= 2) {
                                    this.isReachable[childIdx] = 1;
                                    this.queue.push(child);
                                }
                            } else {
                                this.isReachable[childIdx] = 1;
                                this.queue.push(child);
                            }
                        }
                    }

                    if (this.head >= this.queue.length) {
                        this.phase = 3;
                    }
                    break;
                }

                case 3: {
                    const limit = Math.min(
                        this.applyIdx + budget,
                        this.nodeCount,
                    );
                    const processed = limit - this.applyIdx;
                    budget -= processed;

                    for (let i = this.applyIdx; i < limit; i++) {
                        const node = this.allNodes[i];
                        const data = this.mode.getNodeData(node.nodeIdx);

                        if (node.type === NodeType.EMPTY) {
                            data.isReachable = false;
                            data.isUnoptimized = false;
                            this.setNodeColor(node, DEBUG_COLORS.OFF);
                            continue;
                        }

                        const reachable = this.isReachable[node.nodeIdx] === 1;

                        let uniqueParentsCount = 0;
                        const backLinks = node.backLinks;
                        for (let j = 0; j < backLinks.length; j++) {
                            const parent = backLinks[j];
                            if (
                                parent.type !== NodeType.EMPTY &&
                                parent.type !== NodeType.BLOCKER &&
                                this.isReachable[parent.nodeIdx] === 1
                            ) {
                                uniqueParentsCount++;
                            }
                        }

                        const unoptimized = this.isNodeUnoptimized(
                            node,
                            reachable,
                            uniqueParentsCount,
                            this.isReachable,
                        );

                        if (
                            data.isReachable !== reachable ||
                            data.isUnoptimized !== unoptimized
                        ) {
                            data.isReachable = reachable;
                            data.isUnoptimized = unoptimized;
                        }

                        let color = DEBUG_COLORS.OFF;
                        if (unoptimized) color = DEBUG_COLORS.UNOPTIMIZED;
                        else if (!reachable) color = DEBUG_COLORS.DEAD;

                        this.setNodeColor(node, color);
                    }

                    this.applyIdx = limit;
                    if (this.applyIdx >= this.nodeCount) {
                        this.phase = 4;
                    }
                    break;
                }

                case 4: {
                    return true;
                }
            }
        }

        return this.phase === 4;
    }

    private hasMatchPattern(
        startX: number,
        startY: number,
        targetRelations: readonly [posX: number, posY: number][],
    ): boolean {
        const relPoints: [number, number][] = [];
        for (let i = 0; i < targetRelations.length; i++) {
            relPoints.push([
                targetRelations[i][0] - startX,
                targetRelations[i][1] - startY,
            ]);
        }
        return MATCH_PATTERNS.has(getPatternKey(relPoints));
    }

    private checkIsPathUnoptimized(
        pathNode: GraphNode,
        isReachableArr: Uint8Array,
    ): boolean {
        if (pathNode.type !== NodeType.PATH) return false;

        const links = pathNode.links;
        const totalRelations = getArrowRelations(pathNode.arrowType);
        const totalLen = totalRelations.length;

        let validCount = 0;
        let hasDetectorBacklink = false;

        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (
                link.type !== NodeType.EMPTY &&
                isReachableArr[link.nodeIdx] === 1
            ) {
                validCount++;
                if (
                    link.type === NodeType.DETECTOR &&
                    link.detectedLink === pathNode &&
                    link.backLinks.length === 1
                ) {
                    hasDetectorBacklink = true;
                }
            }
        }

        if (validCount === 0) return totalLen !== 1;

        if (validCount === totalLen) {
            return hasDetectorBacklink;
        }

        const targetRelations: [number, number][] = [];
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (
                link.type !== NodeType.EMPTY &&
                isReachableArr[link.nodeIdx] === 1
            ) {
                targetRelations.push([link.globalX, link.globalY]);
            }
        }

        return this.hasMatchPattern(
            pathNode.globalX,
            pathNode.globalY,
            targetRelations,
        );
    }

    public isNodeUnoptimized(
        node: GraphNode,
        isReachable: boolean,
        uniqueParentsCount: number,
        isReachableArr: Uint8Array,
    ): boolean {
        if (node.type !== NodeType.SOURCE && node.type !== NodeType.IMPULSE) {
            const isAllEmpty = node.links.every(
                (link) => link.type === NodeType.EMPTY,
            );
            if (isAllEmpty && isReachableArr[node.nodeIdx]) return true;
        }
        switch (node.type) {
            case NodeType.BLOCKER:
                return (
                    node.blockedLink === null ||
                    node.blockedLink.type === NodeType.EMPTY
                );

            case NodeType.PATH:
                return (
                    isReachable &&
                    this.checkIsPathUnoptimized(node, isReachableArr)
                );

            case NodeType.DETECTOR: {
                if (
                    node.detectedLink !== null &&
                    node.detectedLink.type === NodeType.PATH
                ) {
                    return this.checkIsPathUnoptimized(
                        node.detectedLink,
                        isReachableArr,
                    );
                }
                return false;
            }

            case NodeType.LOGIC_XOR:
                return isReachable && uniqueParentsCount < 2;

            case NodeType.LOGIC_AND:
            case NodeType.LATCH:
                return !isReachable && uniqueParentsCount === 1;

            default:
                return false;
        }
    }

    private setNodeColor(node: GraphNode, color: DebugColor): void {
        const chunk = this.mode.getDebugChunk(node.chunkIdx);
        if (chunk) {
            chunk.setColor(node.localX, node.localY, color);
        }
    }

    public getResult(): void {}
}

export class DeadNodeDebuggerMode extends DebuggerMode<DeadNodeDebugData> {
    private isScheduled = false;
    private needsReupdate = false;

    public constructor(asyncScheduler: AsyncScheduler) {
        super(asyncScheduler, () => ({
            isUnoptimized: false,
            isReachable: false,
        }));
    }

    public override performNodeUpdate(graph: Graph, _node: GraphNode): void {
        if (this.isScheduled) {
            this.needsReupdate = true;
            return;
        }
        this.scheduleGlobalUpdate(graph);
    }

    private scheduleGlobalUpdate(graph: Graph): void {
        this.isScheduled = true;
        this.needsReupdate = false;

        this.asyncScheduler.schedule(
            new GlobalUpdateTask(graph, this),
            () => {
                this.isScheduled = false;
                if (this.needsReupdate) {
                    this.scheduleGlobalUpdate(graph);
                }
            },
            'global-dead-node-update',
        );
    }

    public override onGraphClear(graph: Graph): void {
        this.isScheduled = false;
        this.needsReupdate = false;
        super.onGraphClear(graph);
    }

    public setChunkColor(
        chunkIdx: number,
        localX: number,
        localY: number,
        color: DebugColor,
    ): void {
        const chunk = this.getDebugChunk(chunkIdx);
        if (chunk) {
            chunk.setColor(localX, localY, color);
        }
    }
}
