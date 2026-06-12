import { CycleBudgetSetting } from 'src/core/settings/instances/performance/CycleBudgetSetting';
import { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import { ArrowType, IsArrowEntryPoint } from 'src/core/utils/ArrowType';
import { CycleHeadType, type GraphCycle } from '../CycleTypes';
import type { Graph } from '../Graph';
import type { GraphNode } from '../GraphNode';
import { CycleSearchTask } from './CycleSearchTask';
import { canBeInCycle } from './utils';

export class CycleManager {
    private readonly scheduler = new AsyncScheduler(
        () => CycleBudgetSetting.value,
    );

    public resetHead(head: GraphNode) {
        head.ioCycle = null;
        head.headType = CycleHeadType.NONE;
        head.cycleOffset = 0;
    }

    private assignCycleHead(
        headNode: GraphNode,
        cycle: GraphCycle,
        headType: CycleHeadType,
        offset: number,
    ) {
        headNode.ioCycle = cycle;
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
            node.origCycleOffset = i;

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
        for (const parent of node.previous) {
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

    private findCyclePathSync(
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

    public onAddNext(graph: Graph, node: GraphNode, target: GraphNode) {
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

        for (const prev of node.previous) {
            refreshExternalCycle(prev.cycleRef);
        }
        for (const next of target.next) {
            refreshExternalCycle(next.cycleRef);
        }

        this.tryRebuildCycle(graph, node);
        this.tryRebuildCycle(graph, target);
    }

    public onRemoveNext(graph: Graph, node: GraphNode, target: GraphNode) {
        this.scheduler.cancel(node);
        this.scheduler.cancel(target);

        if (node.cycleRef !== null && target.cycleRef === node.cycleRef) {
            graph.removeCycle(node.cycleRef);
        }

        this.reevaluateParentCycles(graph, node);

        this.tryRebuildCycle(graph, node);
        this.tryRebuildCycle(graph, target);

        this.updateCycleStatusIfActive(node);
        this.updateCycleStatusIfActive(target);

        if (node.cycleRef !== null) {
            this.refreshCycleIO(node.cycleRef);
        }
        if (target.cycleRef !== null && target.cycleRef !== node.cycleRef) {
            this.refreshCycleIO(target.cycleRef);
        }
    }

    public onClearNext(graph: Graph, node: GraphNode, oldNext: GraphNode[]) {
        this.scheduler.cancel(node);
        for (const oldNode of oldNext) {
            this.scheduler.cancel(oldNode);
        }

        if (node.cycleRef !== null) {
            graph.removeCycle(node.cycleRef);
        }

        this.reevaluateParentCycles(graph, node);

        this.tryRebuildCycle(graph, node);
        for (const oldNode of oldNext) {
            this.tryRebuildCycle(graph, oldNode);
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

    public onChangeType(graph: Graph, node: GraphNode) {
        this.scheduler.cancel(node);
        for (const prev of node.previous) {
            this.scheduler.cancel(prev);
        }
        for (const next of node.next) {
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

        if (node.ioCycle !== null) {
            this.refreshCycleIO(node.ioCycle);
        }

        this.reevaluateParentCycles(graph, node);

        for (const next of node.next) {
            if (next.cycleRef !== null && next.cycleRef !== node.cycleRef) {
                this.validateOrDismantle(graph, next.cycleRef);
            }
        }

        this.tryRebuildCycle(graph, node);
        for (const prev of node.previous) {
            this.tryRebuildCycle(graph, prev);
        }
        for (const next of node.next) {
            this.tryRebuildCycle(graph, next);
        }

        this.updateCycleStatusIfActive(node);
        for (const prev of node.previous) {
            this.updateCycleStatusIfActive(prev);
        }
        for (const next of node.next) {
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
}
