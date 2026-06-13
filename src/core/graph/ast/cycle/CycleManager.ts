import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CycleBudgetSetting } from 'src/core/settings/instances/performance/CycleBudgetSetting';
import { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import { ArrowType, IsArrowEntryPoint } from 'src/core/utils/ArrowType';
import { CycleHeadType, type GraphCycle } from '../CycleTypes';
import type { Graph } from '../Graph';
import type { GraphNode } from '../GraphNode';
import type { IGraphListener } from '../IGraphListener';
import { CycleSearchTask } from './CycleSearchTask';
import { canBeInCycle } from './utils';

export class CycleManager implements IGraphListener {
    private readonly scheduler = new AsyncScheduler(
        () => CycleBudgetSetting.value,
    );

    public resetHead(head: GraphNode) {
        head.cycleRef = null;
        head.headType = CycleHeadType.NONE;
        head.cycleOffset = 0;
    }

    private assignCycleHead(
        headNode: GraphNode,
        cycle: GraphCycle,
        headType: CycleHeadType,
        offset: number,
    ) {
        headNode.cycleRef = cycle;
        headNode.headType = headType;
        headNode.cycleOffset = offset;
        cycle.heads.push(headNode);
    }

    private validateOrDismantle(graph: Graph, cycle: GraphCycle | null) {
        if (!cycle) return;
        if (!this.isValidCycle(cycle.nodes)) {
            graph.removeCycle(cycle);
        } else {
            this.refreshCycleIO(cycle);
        }
    }

    private updateCycleStatusIfActive(node: GraphNode) {
        if (node.isCycle) {
            this.updateCycleStatusAfterRemoval(node);
        }
    }

    public refreshCycleIO(cycle: GraphCycle) {
        cycle.heads.forEach((head) => {
            this.resetHead(head);
        });
        cycle.heads.length = 0;

        const cycleSet = new Set(cycle.nodes);
        const cycleLen = cycle.nodes.length;

        for (let i = 0; i < cycleLen; i++) {
            const node = cycle.nodes[cycleLen - i - 1];
            node.cycleOffset = i;

            for (const linkedNode of node.links) {
                if (
                    linkedNode.type === ArrowType.LOGIC_AND &&
                    !cycleSet.has(linkedNode)
                ) {
                    this.assignCycleHead(
                        linkedNode,
                        cycle,
                        CycleHeadType.READ,
                        i,
                    );
                }
            }

            for (const backLinkedNode of node.backLinks) {
                if (!cycleSet.has(backLinkedNode)) {
                    const offset = (i + 1) % cycleLen;
                    let headType = CycleHeadType.WRITE;

                    if (backLinkedNode.type === ArrowType.BLOCKER) {
                        headType = CycleHeadType.CLEAR;
                    } else if (node.type === ArrowType.LOGIC_XOR) {
                        headType = CycleHeadType.XOR_WRITE;
                    }

                    this.assignCycleHead(
                        backLinkedNode,
                        cycle,
                        headType,
                        offset,
                    );
                }
            }
        }
    }

    public tryRebuildCycle(graph: Graph, startNode: GraphNode) {
        if (startNode.cycleRef !== null || !canBeInCycle(startNode)) {
            return;
        }

        const budget = CycleBudgetSetting.value;
        if (budget === 0) {
            const cyclePath = this.findCyclePathSync(startNode, startNode);
            if (cyclePath !== null && this.isValidCycle(cyclePath)) {
                graph.addCycle(cyclePath);
            }
            return;
        }

        const task = new CycleSearchTask(startNode, startNode);

        this.scheduler.schedule(
            task,
            (path) => {
                if (path !== null && this.isValidCycle(path)) {
                    graph.addCycle(path);
                }
            },
            startNode,
        );
    }

    public reevaluateParentCycles(graph: Graph, node: GraphNode) {
        for (const parent of node.backLinks) {
            this.validateOrDismantle(graph, parent.cycleRef);

            if (parent.cycleRef === null) {
                this.tryRebuildCycle(graph, parent);
            }
        }
    }

    public isValidCycle(cyclePath: GraphNode[]): boolean {
        const cycleSet = new Set<GraphNode>(cyclePath);
        const pathLen = cyclePath.length;

        for (let i = 0; i < pathLen; i++) {
            const cycleNode = cyclePath[i];
            const nextCycleNode = cyclePath[(i + 1) % pathLen];

            const hasExternalLinks = cycleNode.links.some(
                (neighbor) =>
                    !cycleSet.has(neighbor) &&
                    neighbor.type !== ArrowType.EMPTY,
            );

            if (hasExternalLinks) {
                const hasExternalPreviousInLink = nextCycleNode.backLinks.some(
                    (neighbor) => !cycleSet.has(neighbor),
                );

                if (hasExternalPreviousInLink) {
                    return false;
                }
            }

            let hasReadLink = false;
            for (const neighbor of cycleNode.links) {
                if (!cycleSet.has(neighbor)) {
                    if (
                        neighbor.type !== ArrowType.EMPTY &&
                        neighbor.type !== ArrowType.LOGIC_AND
                    ) {
                        return false;
                    }
                } else {
                    if (hasReadLink) return false;
                    hasReadLink = true;
                }
            }

            let hasWriteLink = false;
            for (const neighbor of cycleNode.backLinks) {
                if (!cycleSet.has(neighbor)) {
                    if (neighbor.links.length !== 1) return false;

                    const isInvalidEntryPoint =
                        IsArrowEntryPoint(neighbor.type) ||
                        neighbor.type === ArrowType.RANDOM ||
                        neighbor.type === ArrowType.DELAY ||
                        neighbor.type === ArrowType.LATCH ||
                        neighbor.type === ArrowType.FLIP_FLOP;

                    if (isInvalidEntryPoint) return false;
                    if (hasWriteLink) return false;
                    hasWriteLink = true;
                }
            }
        }

        return true;
    }

    private findCyclePathSync(
        startNode: GraphNode,
        targetNode: GraphNode,
    ): GraphNode[] | null {
        const queue: GraphNode[] = [];
        let head = 0;
        const visited = new Set<GraphNode>();
        const parentMap = new Map<GraphNode, GraphNode>();

        if (startNode === targetNode) {
            for (const child of startNode.links) {
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

            for (const child of current.links) {
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
            this.findCyclePathSync(startNode, startNode) !== null;

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
                                this.findCyclePathSync(neighbor, neighbor) !==
                                null;

                            if (!neighborStillInCycle) {
                                neighbor.isCycle = false;
                                neighbor.cycleRef = null;
                                neighbor.headType = CycleHeadType.NONE;
                                neighbor.cycleOffset = 0;
                                queue.push(neighbor);
                            }
                        }
                    }
                };

                checkNeighbors(current.links);
                checkNeighbors(current.backLinks);
            }
        }
    }

    public onLinkAdded(graph: Graph, node: GraphNode, target: GraphNode) {
        if (canBeInCycle(node) && canBeInCycle(target)) {
            const budget = CycleBudgetSetting.value;
            if (budget === 0) {
                const cyclePath = this.findCyclePathSync(target, node);
                if (cyclePath !== null && this.isValidCycle(cyclePath)) {
                    graph.addCycle(cyclePath);
                    return;
                }
            } else {
                const task = new CycleSearchTask(target, node);
                this.scheduler.schedule(
                    task,
                    (path) => {
                        if (path !== null && this.isValidCycle(path)) {
                            graph.addCycle(path);
                        }
                    },
                    target,
                );
                return;
            }
        }

        this.validateOrDismantle(graph, node.cycleRef);

        if (target.cycleRef !== node.cycleRef) {
            this.validateOrDismantle(graph, target.cycleRef);
        }

        const refreshExternalCycle = (ref: GraphCycle | null) => {
            if (ref && ref !== node.cycleRef && ref !== target.cycleRef) {
                this.refreshCycleIO(ref);
            }
        };

        for (const prev of node.backLinks) {
            refreshExternalCycle(prev.cycleRef);
        }
        for (const next of target.links) {
            refreshExternalCycle(next.cycleRef);
        }

        this.tryRebuildCycle(graph, node);
        this.tryRebuildCycle(graph, target);
    }

    public onLinkRemoved(
        graph: Graph,
        fromNode: GraphNode,
        toNode: GraphNode,
    ): void {
        this.scheduler.cancel(fromNode);
        this.scheduler.cancel(toNode);

        if (
            fromNode.cycleRef !== null &&
            toNode.cycleRef === fromNode.cycleRef
        ) {
            graph.removeCycle(fromNode.cycleRef);
        }

        this.reevaluateParentCycles(graph, fromNode);

        this.tryRebuildCycle(graph, fromNode);
        this.tryRebuildCycle(graph, toNode);

        this.updateCycleStatusIfActive(fromNode);
        this.updateCycleStatusIfActive(toNode);

        if (fromNode.cycleRef !== null) {
            this.refreshCycleIO(fromNode.cycleRef);
        }
        if (toNode.cycleRef !== null && toNode.cycleRef !== fromNode.cycleRef) {
            this.refreshCycleIO(toNode.cycleRef);
        }
    }

    public onNodeTypeChanged(graph: Graph, node: GraphNode) {
        this.scheduler.cancel(node);
        for (const prev of node.backLinks) {
            this.scheduler.cancel(prev);
        }
        for (const next of node.links) {
            this.scheduler.cancel(next);
        }

        if (node.cycleRef !== null) {
            if (
                !canBeInCycle(node) ||
                !this.isValidCycle(node.cycleRef.nodes)
            ) {
                graph.removeCycle(node.cycleRef);
            } else {
                this.refreshCycleIO(node.cycleRef);
            }
        }

        if (node.cycleRef !== null) {
            this.refreshCycleIO(node.cycleRef);
        }

        this.reevaluateParentCycles(graph, node);

        for (const next of node.links) {
            if (next.cycleRef !== null && next.cycleRef !== node.cycleRef) {
                this.validateOrDismantle(graph, next.cycleRef);
            }
        }

        this.tryRebuildCycle(graph, node);
        for (const prev of node.backLinks) {
            this.tryRebuildCycle(graph, prev);
        }
        for (const next of node.links) {
            this.tryRebuildCycle(graph, next);
        }

        this.updateCycleStatusIfActive(node);
        for (const prev of node.backLinks) {
            this.updateCycleStatusIfActive(prev);
        }
        for (const next of node.links) {
            this.updateCycleStatusIfActive(next);
        }
    }

    public attachNodesToCycle(cycle: GraphCycle, nodes: GraphNode[]) {
        for (const node of nodes) {
            node.isCycle = true;
            node.cycleRef = cycle;
        }
        this.refreshCycleIO(cycle);
    }

    public detachNodesFromCycle(cycle: GraphCycle) {
        for (const node of cycle.nodes) {
            node.isCycle = false;
            node.cycleRef = null;
            node.headType = CycleHeadType.NONE;
            node.cycleOffset = 0;
        }

        for (const head of cycle.heads) {
            this.resetHead(head);
        }
    }

    public onGraphClear(_graph: Graph): void {}

    public onCycleAdded(_graph: Graph, _cycle: GraphCycle): void {}

    public onCycleRemoved(_graph: Graph, _cycle: GraphCycle): void {}

    public onChunkAdded(
        _graph: Graph,
        _chunk: Chunk,
        _chunkIdx: number,
    ): void {}

    public onNodeAdded(_graph: Graph, _node: GraphNode): void {}
}
