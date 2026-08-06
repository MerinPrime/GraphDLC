import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CycleBudgetSetting } from 'src/core/settings/instances/performance/CycleBudgetSetting';
import { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import { NodeType, NodeTypes } from '../../engines/core/NodeType';
import { CycleHeadType, type GraphCycle } from '../CycleTypes';
import type { Graph } from '../Graph';
import type { GraphNode } from '../GraphNode';
import type { IGraphListener } from '../IGraphListener';
import { CycleSearchTask } from './CycleSearchTask';
import { canBeInCycle } from './utils';

export class CycleManager implements IGraphListener {
    private readonly bfsQueue: GraphNode[] = [];
    private readonly bfsParentMap = new Map<GraphNode, GraphNode>();
    private readonly validationSet = new Set<GraphNode>();
    private readonly removalQueue: GraphNode[] = [];
    private readonly removalVisited = new Set<GraphNode>();

    private readonly scheduler = new AsyncScheduler(
        // () => CycleBudgetSetting.value,
        () => 16,
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

    private validateOrDismantle(
        graph: Graph,
        cycle: GraphCycle | null,
    ): boolean {
        if (!cycle) return false;
        if (!this.isValidCycle(cycle.nodes)) {
            graph.removeCycle(cycle);
            return true;
        } else {
            this.refreshCycleIO(cycle);
            return false;
        }
    }

    private updateCycleStatusIfActive(node: GraphNode) {
        if (node.isCycle) {
            this.updateCycleStatusAfterRemoval(node);
        }
    }

    public refreshCycleIO(cycle: GraphCycle) {
        const heads = cycle.heads;
        const headsLen = heads.length;
        for (let i = 0; i < headsLen; i++) {
            this.resetHead(heads[i]);
        }
        heads.length = 0;

        const cycleSet = this.validationSet;
        cycleSet.clear();
        const cycleNodes = cycle.nodes;
        const cycleLen = cycleNodes.length;
        for (let i = 0; i < cycleLen; i++) {
            cycleSet.add(cycleNodes[i]);
        }

        for (let i = 0; i < cycleLen; i++) {
            const node = cycleNodes[cycleLen - i - 1];
            node.cycleOffset = i;

            const links = node.links;
            const linksLen = links.length;
            for (let j = 0; j < linksLen; j++) {
                const linkedNode = links[j];
                if (
                    linkedNode.type === NodeType.LOGIC_AND &&
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

            const backLinks = node.backLinks;
            const backLinksLen = backLinks.length;
            for (let j = 0; j < backLinksLen; j++) {
                const backLinkedNode = backLinks[j];
                if (!cycleSet.has(backLinkedNode)) {
                    const offset = (i + 1) % cycleLen;
                    let headType = CycleHeadType.WRITE;

                    if (backLinkedNode.type === NodeType.BLOCKER) {
                        headType = CycleHeadType.CLEAR;
                    } else if (node.type === NodeType.LOGIC_XOR) {
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
        cycleSet.clear();
    }

    public tryRebuildCycle(graph: Graph, startNode: GraphNode) {
        if (startNode.cycleRef !== null || !canBeInCycle(startNode)) {
            return;
        }

        const budget = CycleBudgetSetting.value;
        if (budget === 0) {
            const cyclePath = this.findCyclePathSync(startNode, startNode);
            if (cyclePath !== null && this.isValidCycle(cyclePath)) {
                let allNull = true;
                for (let i = 0; i < cyclePath.length; i++) {
                    if (cyclePath[i].cycleRef !== null) {
                        allNull = false;
                        break;
                    }
                }
                if (allNull) {
                    graph.addCycle(cyclePath);
                }
            }
            return;
        }

        const task = new CycleSearchTask(startNode, startNode);

        this.scheduler.schedule(
            task,
            (path) => {
                if (path !== null && this.isValidCycle(path)) {
                    let allNull = true;
                    for (let i = 0; i < path.length; i++) {
                        if (path[i].cycleRef !== null) {
                            allNull = false;
                            break;
                        }
                    }
                    if (allNull) {
                        graph.addCycle(path);
                    }
                }
            },
            startNode,
        );
    }

    public reevaluateParentCycles(graph: Graph, node: GraphNode) {
        this.reevaluateParentCyclesTrack(graph, node);
    }

    private reevaluateParentCyclesTrack(
        graph: Graph,
        node: GraphNode,
    ): boolean {
        let dismantled = false;
        const backLinks = node.backLinks;
        const backLinksLen = backLinks.length;

        for (let i = 0; i < backLinksLen; i++) {
            const parent = backLinks[i];
            const ref = parent.cycleRef;
            if (ref !== null) {
                if (!this.isValidCycle(ref.nodes)) {
                    graph.removeCycle(ref);
                    dismantled = true;
                } else {
                    this.refreshCycleIO(ref);
                }
            }
        }

        if (dismantled) {
            for (let i = 0; i < backLinksLen; i++) {
                const parent = backLinks[i];
                if (parent.cycleRef === null) {
                    this.tryRebuildCycle(graph, parent);
                }
            }
        }

        return dismantled;
    }

    public isValidCycle(cyclePath: GraphNode[]): boolean {
        const cycleSet = this.validationSet;
        cycleSet.clear();
        const pathLen = cyclePath.length;
        for (let i = 0; i < pathLen; i++) {
            cycleSet.add(cyclePath[i]);
        }

        for (let i = 0; i < pathLen; i++) {
            const cycleNode = cyclePath[i];
            const nextCycleNode = cyclePath[(i + 1) % pathLen];

            let hasExternalLinks = false;
            const links = cycleNode.links;
            const linksLen = links.length;
            for (let j = 0; j < linksLen; j++) {
                const neighbor = links[j];
                if (
                    !cycleSet.has(neighbor) &&
                    neighbor.type !== NodeType.EMPTY
                ) {
                    hasExternalLinks = true;
                    break;
                }
            }

            if (hasExternalLinks) {
                let hasExternalPreviousInLink = false;
                const backLinks = nextCycleNode.backLinks;
                const backLinksLen = backLinks.length;
                for (let j = 0; j < backLinksLen; j++) {
                    const neighbor = backLinks[j];
                    if (!cycleSet.has(neighbor)) {
                        hasExternalPreviousInLink = true;
                        break;
                    }
                }

                if (hasExternalPreviousInLink) {
                    cycleSet.clear();
                    return false;
                }
            }

            let hasReadLink = false;
            for (let j = 0; j < linksLen; j++) {
                const neighbor = links[j];
                if (!cycleSet.has(neighbor)) {
                    if (
                        neighbor.type !== NodeType.EMPTY &&
                        neighbor.type !== NodeType.LOGIC_AND
                    ) {
                        cycleSet.clear();
                        return false;
                    }
                } else {
                    if (hasReadLink) {
                        cycleSet.clear();
                        return false;
                    }
                    hasReadLink = true;
                }
            }

            let hasWriteLink = false;
            const nodeBackLinks = cycleNode.backLinks;
            const nodeBackLinksLen = nodeBackLinks.length;
            for (let j = 0; j < nodeBackLinksLen; j++) {
                const neighbor = nodeBackLinks[j];
                if (!cycleSet.has(neighbor)) {
                    if (neighbor.links.length !== 1) {
                        cycleSet.clear();
                        return false;
                    }

                    const type = neighbor.type;
                    const isInvalidEntryPoint =
                        NodeTypes.isEntryPoint(type) ||
                        type === NodeType.RANDOM ||
                        type === NodeType.DELAY ||
                        type === NodeType.LATCH ||
                        type === NodeType.FLIP_FLOP;

                    if (isInvalidEntryPoint) {
                        cycleSet.clear();
                        return false;
                    }
                    if (hasWriteLink) {
                        cycleSet.clear();
                        return false;
                    }
                    hasWriteLink = true;
                }
            }
        }

        cycleSet.clear();
        return true;
    }

    private findCyclePathSync(
        startNode: GraphNode,
        targetNode: GraphNode,
    ): GraphNode[] | null {
        const queue = this.bfsQueue;
        const parentMap = this.bfsParentMap;

        queue.length = 0;
        parentMap.clear();
        let head = 0;

        if (startNode === targetNode) {
            const links = startNode.links;
            const linksLen = links.length;
            for (let i = 0; i < linksLen; i++) {
                const child = links[i];
                if (canBeInCycle(child)) {
                    queue.push(child);
                    parentMap.set(child, startNode);
                }
            }
        } else {
            queue.push(startNode);
            parentMap.set(startNode, startNode);
        }

        let found = false;
        let lastNode = startNode;

        while (head < queue.length) {
            const current = queue[head++];
            const links = current.links;
            const linksLen = links.length;

            for (let i = 0; i < linksLen; i++) {
                const child = links[i];
                if (child === targetNode) {
                    found = true;
                    lastNode = current;
                    break;
                }

                if (!canBeInCycle(child)) continue;

                if (!parentMap.has(child)) {
                    parentMap.set(child, current);
                    queue.push(child);
                }
            }
            if (found) break;
        }

        if (found) {
            const path: GraphNode[] = [targetNode];
            let curr: GraphNode | undefined = lastNode;

            while (curr !== undefined && curr !== startNode) {
                path.push(curr);
                curr = parentMap.get(curr);
            }
            if (startNode !== targetNode) {
                path.push(startNode);
            }
            queue.length = 0;
            parentMap.clear();
            return path.reverse();
        }

        queue.length = 0;
        parentMap.clear();
        return null;
    }

    public updateCycleStatusAfterRemoval(startNode: GraphNode) {
        if (startNode.cycleRef !== null) {
            return;
        }

        const isStillInCycle =
            this.findCyclePathSync(startNode, startNode) !== null;

        if (!isStillInCycle) {
            const queue = this.removalQueue;
            const visited = this.removalVisited;

            queue.length = 0;
            visited.clear();

            queue.push(startNode);
            visited.add(startNode);
            startNode.isCycle = false;

            let head = 0;
            while (head < queue.length) {
                const current = queue[head++];

                const links = current.links;
                const linksLen = links.length;
                for (let i = 0; i < linksLen; i++) {
                    const neighbor = links[i];
                    if (neighbor.isCycle && !visited.has(neighbor)) {
                        visited.add(neighbor);
                        const neighborStillInCycle = neighbor.cycleRef !== null;

                        if (!neighborStillInCycle) {
                            neighbor.isCycle = false;
                            neighbor.cycleRef = null;
                            neighbor.headType = CycleHeadType.NONE;
                            neighbor.cycleOffset = 0;
                            queue.push(neighbor);
                        }
                    }
                }

                const backLinks = current.backLinks;
                const backLinksLen = backLinks.length;
                for (let i = 0; i < backLinksLen; i++) {
                    const neighbor = backLinks[i];
                    if (neighbor.isCycle && !visited.has(neighbor)) {
                        visited.add(neighbor);
                        const neighborStillInCycle = neighbor.cycleRef !== null;

                        if (!neighborStillInCycle) {
                            neighbor.isCycle = false;
                            neighbor.cycleRef = null;
                            neighbor.headType = CycleHeadType.NONE;
                            neighbor.cycleOffset = 0;
                            queue.push(neighbor);
                        }
                    }
                }
            }
            queue.length = 0;
            visited.clear();
        }
    }

    public onLinkAdded(graph: Graph, node: GraphNode, target: GraphNode) {
        let cycleCreated = false;

        if (canBeInCycle(node) && canBeInCycle(target)) {
            const budget = CycleBudgetSetting.value;
            if (budget === 0) {
                const cyclePath = this.findCyclePathSync(target, node);
                if (cyclePath !== null && this.isValidCycle(cyclePath)) {
                    let allNull = true;
                    for (let i = 0; i < cyclePath.length; i++) {
                        if (cyclePath[i].cycleRef !== null) {
                            allNull = false;
                            break;
                        }
                    }
                    if (allNull) {
                        graph.addCycle(cyclePath);
                        cycleCreated = true;
                    }
                }
            } else {
                const task = new CycleSearchTask(target, node);
                this.scheduler.schedule(
                    task,
                    (path) => {
                        if (path !== null && this.isValidCycle(path)) {
                            let allNull = true;
                            for (let i = 0; i < path.length; i++) {
                                if (path[i].cycleRef !== null) {
                                    allNull = false;
                                    break;
                                }
                            }
                            if (allNull) {
                                graph.addCycle(path);
                                if (node.cycleRef !== null) {
                                    this.refreshCycleIO(node.cycleRef);
                                }
                            }
                        }
                    },
                    target,
                );
                return;
            }
        }

        if (cycleCreated) {
            return;
        }

        const nodeCycleRef = node.cycleRef;
        const targetCycleRef = target.cycleRef;
        let dismantled = false;

        if (nodeCycleRef !== null) {
            dismantled =
                this.validateOrDismantle(graph, nodeCycleRef) || dismantled;
        }
        if (targetCycleRef !== null && targetCycleRef !== nodeCycleRef) {
            dismantled =
                this.validateOrDismantle(graph, targetCycleRef) || dismantled;
        }

        const backLinks = node.backLinks;
        for (let i = 0; i < backLinks.length; i++) {
            const ref = backLinks[i].cycleRef;
            if (
                ref !== null &&
                ref !== nodeCycleRef &&
                ref !== targetCycleRef
            ) {
                this.refreshCycleIO(ref);
            }
        }

        const targetLinks = target.links;
        for (let i = 0; i < targetLinks.length; i++) {
            const ref = targetLinks[i].cycleRef;
            if (
                ref !== null &&
                ref !== nodeCycleRef &&
                ref !== targetCycleRef
            ) {
                this.refreshCycleIO(ref);
            }
        }

        if (dismantled) {
            this.tryRebuildCycle(graph, node);
            this.tryRebuildCycle(graph, target);
        }
    }

    public onLinkRemoved(
        graph: Graph,
        fromNode: GraphNode,
        toNode: GraphNode,
    ): void {
        this.scheduler.cancel(fromNode);
        this.scheduler.cancel(toNode);

        const fromCycleRef = fromNode.cycleRef;
        const toCycleRef = toNode.cycleRef;

        let cycleDismantled = false;
        if (fromCycleRef !== null && toCycleRef === fromCycleRef) {
            graph.removeCycle(fromCycleRef);
            cycleDismantled = true;
        }

        const parentsDismantled = this.reevaluateParentCyclesTrack(
            graph,
            fromNode,
        );

        const anyDismantled = cycleDismantled || parentsDismantled;

        if (anyDismantled) {
            this.tryRebuildCycle(graph, fromNode);
            this.tryRebuildCycle(graph, toNode);
        }

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

        const backLinks = node.backLinks;
        for (let i = 0; i < backLinks.length; i++) {
            this.scheduler.cancel(backLinks[i]);
        }

        const links = node.links;
        for (let i = 0; i < links.length; i++) {
            this.scheduler.cancel(links[i]);
        }

        let dismantled = false;

        if (node.cycleRef !== null) {
            if (
                !canBeInCycle(node) ||
                !this.isValidCycle(node.cycleRef.nodes)
            ) {
                graph.removeCycle(node.cycleRef);
                dismantled = true;
            } else {
                this.refreshCycleIO(node.cycleRef);
            }
        }

        const parentsDismantled = this.reevaluateParentCyclesTrack(graph, node);
        dismantled = dismantled || parentsDismantled;

        for (let i = 0; i < links.length; i++) {
            const next = links[i];
            const ref = next.cycleRef;
            if (ref !== null && ref !== node.cycleRef) {
                if (!this.isValidCycle(ref.nodes)) {
                    graph.removeCycle(ref);
                    dismantled = true;
                } else {
                    this.refreshCycleIO(ref);
                }
            }
        }

        const canCreateCycle = !node.isCycle && canBeInCycle(node);

        if (dismantled || canCreateCycle) {
            this.tryRebuildCycle(graph, node);

            for (let i = 0; i < links.length; i++) {
                this.tryRebuildCycle(graph, links[i]);
            }
        }

        this.updateCycleStatusIfActive(node);

        for (let i = 0; i < backLinks.length; i++) {
            this.updateCycleStatusIfActive(backLinks[i]);
        }
        for (let i = 0; i < links.length; i++) {
            this.updateCycleStatusIfActive(links[i]);
        }
    }

    public attachNodesToCycle(cycle: GraphCycle, nodes: GraphNode[]) {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            node.isCycle = true;
            node.cycleRef = cycle;
        }
        this.refreshCycleIO(cycle);
    }

    public detachNodesFromCycle(cycle: GraphCycle) {
        const nodes = cycle.nodes;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            node.isCycle = false;
            node.cycleRef = null;
            node.headType = CycleHeadType.NONE;
            node.cycleOffset = 0;
        }

        const heads = cycle.heads;
        for (let i = 0; i < heads.length; i++) {
            this.resetHead(heads[i]);
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
