import { ArrowType, IsArrowEntryPoint } from 'src/core/utils/ArrowType';
import { CycleHeadType, type RawCycle } from './CycleTypes';
import type { Graph } from './Graph';
import type { GraphNode } from './GraphNode';

const ALLOWED_IN_CYCLE = new Set([
    ArrowType.ARROW,
    ArrowType.SPLITTER_UP_DOWN,
    ArrowType.SPLITTER_UP_RIGHT,
    ArrowType.SPLITTER_UP_RIGHT_LEFT,
    ArrowType.BLUE_ARROW,
    ArrowType.DIAGONAL_ARROW,
    ArrowType.SPLITTER_UP_UP,
    ArrowType.SPLITTER_RIGHT_UP,
    ArrowType.SPLITTER_UP_DIAGONAL,
    ArrowType.LOGIC_XOR,
]);

function canBeInCycle(node: GraphNode): boolean {
    return ALLOWED_IN_CYCLE.has(node.type);
}

export class CycleManager {
    private graph: Graph;

    public constructor(graph: Graph) {
        this.graph = graph;
    }

    public resetHead(head: GraphNode) {
        head.ioCycle = null;
        head.headType = CycleHeadType.NONE;
        head.cycleOffset = 0;
        const headState = this.graph.graphState.getNode(head.nodeIdx);
        if (headState) {
            headState.nodeInCycleOffset = 0;
        }
    }

    private assignCycleHead(
        headNode: GraphNode,
        cycle: RawCycle,
        headType: CycleHeadType,
        offset: number,
    ) {
        headNode.ioCycle = cycle;
        headNode.headType = headType;
        headNode.cycleOffset = offset;

        const headState = this.graph.graphState.getNode(headNode.nodeIdx);
        if (headState) {
            headState.nodeInCycleOffset = offset;
        }
        cycle.heads.push(headNode);
    }

    private validateOrDismantle(cycle: RawCycle | null) {
        if (!cycle) return;
        if (!this.isValidCycle(cycle.nodes)) {
            this.graph.removeCycle(cycle);
        } else {
            this.refreshCycleIO(cycle);
        }
    }

    private updateCycleStatusIfActive(node: GraphNode) {
        if (node.isCycle) {
            this.updateCycleStatusAfterRemoval(node);
        }
    }

    public refreshCycleIO(cycle: RawCycle) {
        cycle.heads.forEach((head) => {
            this.resetHead(head);
        });
        cycle.heads.length = 0;

        const cycleSet = new Set(cycle.nodes);
        const cycleLen = cycle.nodes.length;

        for (let i = 0; i < cycleLen; i++) {
            const node = cycle.nodes[cycleLen - i - 1];
            node.cycleOffset = i;
            node.origCycleOffset = i;

            const nodeState = this.graph.graphState.getNode(node.nodeIdx);
            if (nodeState) {
                nodeState.nodeInCycleOffset = i;
            }

            for (const nextNode of node.next) {
                if (
                    nextNode.type === ArrowType.LOGIC_AND &&
                    !cycleSet.has(nextNode)
                ) {
                    this.assignCycleHead(
                        nextNode,
                        cycle,
                        CycleHeadType.READ,
                        i,
                    );
                }
            }

            for (const prevNode of node.previous) {
                if (!cycleSet.has(prevNode)) {
                    const offset = (i + 1) % cycleLen;
                    let headType = CycleHeadType.WRITE;

                    if (prevNode.type === ArrowType.BLOCKER) {
                        headType = CycleHeadType.CLEAR;
                    } else if (node.type === ArrowType.LOGIC_XOR) {
                        headType = CycleHeadType.XOR_WRITE;
                    }

                    this.assignCycleHead(prevNode, cycle, headType, offset);
                }
            }
        }
    }

    public tryRebuildCycle(startNode: GraphNode) {
        if (startNode.cycleRef !== null || !canBeInCycle(startNode)) {
            return;
        }

        const cyclePath = this.findCyclePath(startNode, startNode);
        if (cyclePath !== null && this.isValidCycle(cyclePath)) {
            this.graph.addCycle(cyclePath);
        }
    }

    public reevaluateParentCycles(node: GraphNode) {
        for (const parent of node.previous) {
            this.validateOrDismantle(parent.cycleRef);

            if (parent.cycleRef === null) {
                this.tryRebuildCycle(parent);
            }
        }
    }

    public isValidCycle(cyclePath: GraphNode[]): boolean {
        const cycleSet = new Set<GraphNode>(cyclePath);
        const pathLen = cyclePath.length;

        for (let i = 0; i < pathLen; i++) {
            const cycleNode = cyclePath[i];
            const nextCycleNode = cyclePath[(i + 1) % pathLen];

            const hasExternalNext = cycleNode.next.some(
                (neighbor) =>
                    !cycleSet.has(neighbor) &&
                    neighbor.type !== ArrowType.EMPTY,
            );

            if (hasExternalNext) {
                const hasExternalPreviousInNextNode =
                    nextCycleNode.previous.some(
                        (neighbor) => !cycleSet.has(neighbor),
                    );

                if (hasExternalPreviousInNextNode) {
                    return false;
                }
            }

            let moreThanOneNext = false;
            for (const neighbor of cycleNode.next) {
                if (!cycleSet.has(neighbor)) {
                    if (
                        neighbor.type !== ArrowType.EMPTY &&
                        neighbor.type !== ArrowType.LOGIC_AND
                    ) {
                        return false;
                    }
                } else {
                    if (moreThanOneNext) return false;
                    moreThanOneNext = true;
                }
            }

            let moreThanOneWrite = false;
            for (const neighbor of cycleNode.previous) {
                if (!cycleSet.has(neighbor)) {
                    if (neighbor.next.length !== 1) return false;

                    const isInvalidEntryPoint =
                        IsArrowEntryPoint(neighbor.type) ||
                        neighbor.type === ArrowType.RANDOM ||
                        neighbor.type === ArrowType.DELAY ||
                        neighbor.type === ArrowType.LATCH ||
                        neighbor.type === ArrowType.FLIP_FLOP;

                    if (isInvalidEntryPoint) return false;
                    if (moreThanOneWrite) return false;
                    moreThanOneWrite = true;
                }
            }
        }

        return true;
    }

    public findCyclePath(
        startNode: GraphNode,
        targetNode: GraphNode,
    ): GraphNode[] | null {
        const queue: GraphNode[] = [];
        let head = 0;
        const visited = new Set<GraphNode>();
        const parentMap = new Map<GraphNode, GraphNode>();

        if (startNode === targetNode) {
            for (const child of startNode.next) {
                if (canBeInCycle(child)) {
                    queue.push(child);
                    visited.add(child);
                    parentMap.set(child, startNode);
                }
            }
        } else {
            queue.push(startNode);
            visited.add(startNode);
        }

        while (head < queue.length) {
            const current = queue[head++];

            for (const child of current.next) {
                if (child === targetNode) {
                    const path: GraphNode[] = [targetNode];
                    let curr: GraphNode | undefined = current;

                    while (curr !== undefined && curr !== startNode) {
                        path.push(curr);
                        curr = parentMap.get(curr);
                    }
                    if (startNode !== targetNode) {
                        path.push(startNode);
                    }
                    return path.reverse();
                }

                if (!canBeInCycle(child)) continue;

                if (!visited.has(child)) {
                    visited.add(child);
                    parentMap.set(child, current);
                    queue.push(child);
                }
            }
        }

        return null;
    }

    public updateCycleStatusAfterRemoval(startNode: GraphNode) {
        const isStillInCycle =
            this.findCyclePath(startNode, startNode) !== null;

        if (!isStillInCycle) {
            const queue: GraphNode[] = [startNode];
            let head = 0;
            const visited = new Set<GraphNode>([startNode]);
            startNode.isCycle = false;

            while (head < queue.length) {
                const current = queue[head++];

                const checkNeighbors = (neighbors: GraphNode[]) => {
                    for (const neighbor of neighbors) {
                        if (neighbor.isCycle && !visited.has(neighbor)) {
                            visited.add(neighbor);
                            const neighborStillInCycle =
                                this.findCyclePath(neighbor, neighbor) !== null;

                            if (!neighborStillInCycle) {
                                neighbor.isCycle = false;
                                neighbor.cycleRef = null;
                                queue.push(neighbor);
                            }
                        }
                    }
                };

                checkNeighbors(current.next);
                checkNeighbors(current.previous);
            }
        }
    }

    public onAddNext(node: GraphNode, target: GraphNode) {
        if (canBeInCycle(node) && canBeInCycle(target)) {
            const cyclePath = this.findCyclePath(target, node);

            if (cyclePath !== null && this.isValidCycle(cyclePath)) {
                this.graph.addCycle(cyclePath);
                return;
            }
        }

        this.validateOrDismantle(node.cycleRef);

        if (target.cycleRef !== node.cycleRef) {
            this.validateOrDismantle(target.cycleRef);
        }

        const refreshExternalCycle = (ref: RawCycle | null) => {
            if (ref && ref !== node.cycleRef && ref !== target.cycleRef) {
                this.refreshCycleIO(ref);
            }
        };

        for (const prev of node.previous) {
            refreshExternalCycle(prev.cycleRef);
        }
        for (const next of target.next) {
            refreshExternalCycle(next.cycleRef);
        }

        this.tryRebuildCycle(node);
        this.tryRebuildCycle(target);
    }

    public onRemoveNext(node: GraphNode, target: GraphNode) {
        if (node.cycleRef !== null && target.cycleRef === node.cycleRef) {
            this.graph.removeCycle(node.cycleRef);
        }

        this.reevaluateParentCycles(node);

        this.tryRebuildCycle(node);
        this.tryRebuildCycle(target);

        this.updateCycleStatusIfActive(node);
        this.updateCycleStatusIfActive(target);

        if (node.cycleRef !== null) {
            this.refreshCycleIO(node.cycleRef);
        }
        if (target.cycleRef !== null && target.cycleRef !== node.cycleRef) {
            this.refreshCycleIO(target.cycleRef);
        }
    }

    public onClearNext(node: GraphNode, oldNext: GraphNode[]) {
        if (node.cycleRef !== null) {
            this.graph.removeCycle(node.cycleRef);
        }

        this.reevaluateParentCycles(node);

        this.tryRebuildCycle(node);
        for (const oldNode of oldNext) {
            this.tryRebuildCycle(oldNode);
        }

        this.updateCycleStatusIfActive(node);

        for (const oldNode of oldNext) {
            this.updateCycleStatusIfActive(oldNode);

            if (
                oldNode.cycleRef !== null &&
                oldNode.cycleRef !== node.cycleRef
            ) {
                this.refreshCycleIO(oldNode.cycleRef);
            }
        }

        if (node.cycleRef !== null) {
            this.refreshCycleIO(node.cycleRef);
        }
    }

    public onChangeType(node: GraphNode) {
        if (node.cycleRef !== null) {
            if (
                !canBeInCycle(node) ||
                !this.isValidCycle(node.cycleRef.nodes)
            ) {
                this.graph.removeCycle(node.cycleRef);
            } else {
                this.refreshCycleIO(node.cycleRef);
            }
        }

        if (node.ioCycle !== null) {
            this.refreshCycleIO(node.ioCycle);
        }

        this.reevaluateParentCycles(node);

        for (const next of node.next) {
            if (next.cycleRef !== null && next.cycleRef !== node.cycleRef) {
                this.validateOrDismantle(next.cycleRef);
            }
        }

        this.tryRebuildCycle(node);
        for (const prev of node.previous) {
            this.tryRebuildCycle(prev);
        }
        for (const next of node.next) {
            this.tryRebuildCycle(next);
        }

        this.updateCycleStatusIfActive(node);
        for (const prev of node.previous) {
            this.updateCycleStatusIfActive(prev);
        }
        for (const next of node.next) {
            this.updateCycleStatusIfActive(next);
        }
    }
}
