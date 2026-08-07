import type { Chunk } from '@logic-arrows/game-logic/chunk';
import {
    CycleHeadType,
    type GraphCycle,
} from 'src/core/graph/ast/cycle/CycleTypes';
import { CycleBudgetSetting } from 'src/core/settings/instances/performance/CycleBudgetSetting';
import { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import { NodeType, NodeTypes } from '../../engines/core/NodeType';
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

    public resetHead(head: GraphNode): void {
        head.cycleRef = null;
        head.headType = CycleHeadType.NONE;
        head.cycleOffset = 0;
    }

    private resetNodeCycleState(node: GraphNode): void {
        node.isCycle = false;
        node.cycleRef = null;
        node.headType = CycleHeadType.NONE;
        node.cycleOffset = 0;
    }

    private assignCycleHead(
        headNode: GraphNode,
        cycle: GraphCycle,
        headType: CycleHeadType,
        offset: number,
    ): void {
        headNode.cycleRef = cycle;
        headNode.headType = headType;
        headNode.cycleOffset = offset;
        cycle.heads.push(headNode);
    }

    private tryAddCycle(graph: Graph, path: GraphNode[] | null): boolean {
        if (!path || !this.isValidCycle(path)) {
            return false;
        }

        for (let i = 0; i < path.length; i++) {
            if (path[i].cycleRef !== null) return false;
        }

        graph.addCycle(path);
        return true;
    }

    public refreshCycleIO(cycle: GraphCycle): void {
        const { heads, nodes: cycleNodes } = cycle;

        for (let i = 0; i < heads.length; i++) {
            this.resetHead(heads[i]);
        }
        heads.length = 0;

        const cycleSet = this.validationSet;
        cycleSet.clear();

        const cycleLen = cycleNodes.length;
        for (let i = 0; i < cycleLen; i++) {
            cycleSet.add(cycleNodes[i]);
        }

        try {
            for (let i = 0; i < cycleLen; i++) {
                const node = cycleNodes[cycleLen - i - 1];
                node.cycleOffset = i;

                for (let j = 0; j < node.links.length; j++) {
                    const linkedNode = node.links[j];
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

                for (let j = 0; j < node.backLinks.length; j++) {
                    const backLinkedNode = node.backLinks[j];
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
        } finally {
            cycleSet.clear();
        }
    }

    public tryRebuildCycle(graph: Graph, startNode: GraphNode): void {
        if (startNode.cycleRef !== null || !canBeInCycle(startNode)) {
            return;
        }

        if (CycleBudgetSetting.value === 0) {
            const cyclePath = this.findCyclePathSync(startNode, startNode);
            this.tryAddCycle(graph, cyclePath);
            return;
        }

        const task = new CycleSearchTask(startNode, startNode);
        this.scheduler.schedule(
            task,
            (path) => this.tryAddCycle(graph, path),
            startNode,
        );
    }

    public reevaluateParentCycles(graph: Graph, node: GraphNode): void {
        this.reevaluateParentCyclesTrack(graph, node);
    }

    private reevaluateParentCyclesTrack(
        graph: Graph,
        node: GraphNode,
    ): boolean {
        let dismantled = false;
        const { backLinks } = node;

        for (let i = 0; i < backLinks.length; i++) {
            const ref = backLinks[i].cycleRef;
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
            for (let i = 0; i < backLinks.length; i++) {
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

        try {
            for (let i = 0; i < pathLen; i++) {
                const cycleNode = cyclePath[i];
                const nextCycleNode = cyclePath[(i + 1) % pathLen];

                if (!this.validateNodeIO(cycleNode, nextCycleNode, cycleSet)) {
                    return false;
                }
            }
            return true;
        } finally {
            cycleSet.clear();
        }
    }

    private validateNodeIO(
        cycleNode: GraphNode,
        nextCycleNode: GraphNode,
        cycleSet: Set<GraphNode>,
    ): boolean {
        const { links, backLinks: nodeBackLinks } = cycleNode;

        let hasExternalLinks = false;
        for (let j = 0; j < links.length; j++) {
            const neighbor = links[j];
            if (!cycleSet.has(neighbor) && neighbor.type !== NodeType.EMPTY) {
                hasExternalLinks = true;
                break;
            }
        }

        if (hasExternalLinks) {
            const { backLinks } = nextCycleNode;
            for (let j = 0; j < backLinks.length; j++) {
                if (!cycleSet.has(backLinks[j])) {
                    return false;
                }
            }
        }

        let hasReadLink = false;
        for (let j = 0; j < links.length; j++) {
            const neighbor = links[j];
            if (!cycleSet.has(neighbor)) {
                if (
                    neighbor.type !== NodeType.EMPTY &&
                    neighbor.type !== NodeType.LOGIC_AND
                ) {
                    return false;
                }
            } else {
                if (hasReadLink) return false;
                hasReadLink = true;
            }
        }

        let hasWriteLink = false;
        for (let j = 0; j < nodeBackLinks.length; j++) {
            const neighbor = nodeBackLinks[j];
            if (!cycleSet.has(neighbor)) {
                if (neighbor.links.length !== 1) return false;

                const { type } = neighbor;
                const isInvalidEntryPoint =
                    NodeTypes.isEntryPoint(type) ||
                    type === NodeType.RANDOM ||
                    type === NodeType.DELAY ||
                    type === NodeType.LATCH ||
                    type === NodeType.FLIP_FLOP;

                if (isInvalidEntryPoint || hasWriteLink) return false;
                hasWriteLink = true;
            }
        }

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

        try {
            if (startNode === targetNode) {
                const { links } = startNode;
                for (let i = 0; i < links.length; i++) {
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
                const { links } = current;

                for (let i = 0; i < links.length; i++) {
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
                return path.reverse();
            }

            return null;
        } finally {
            queue.length = 0;
            parentMap.clear();
        }
    }

    public updateCycleStatusAfterRemoval(startNode: GraphNode): void {
        if (startNode.cycleRef !== null) return;

        if (this.findCyclePathSync(startNode, startNode) === null) {
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
                this.processRemovalNeighbors(current.links, queue, visited);
                this.processRemovalNeighbors(current.backLinks, queue, visited);
            }

            queue.length = 0;
            visited.clear();
        }
    }

    private processRemovalNeighbors(
        neighbors: readonly GraphNode[],
        queue: GraphNode[],
        visited: Set<GraphNode>,
    ): void {
        for (let i = 0; i < neighbors.length; i++) {
            const neighbor = neighbors[i];
            if (neighbor.isCycle && !visited.has(neighbor)) {
                visited.add(neighbor);
                if (neighbor.cycleRef === null) {
                    this.resetNodeCycleState(neighbor);
                    queue.push(neighbor);
                }
            }
        }
    }

    private validateOrDismantle(
        graph: Graph,
        cycle: GraphCycle | null,
    ): boolean {
        if (!cycle) return false;
        if (!this.isValidCycle(cycle.nodes)) {
            graph.removeCycle(cycle);
            return true;
        }
        this.refreshCycleIO(cycle);
        return false;
    }

    private updateCycleStatusIfActive(node: GraphNode): void {
        if (node.isCycle) {
            this.updateCycleStatusAfterRemoval(node);
        }
    }

    public onLinkAdded(graph: Graph, node: GraphNode, target: GraphNode): void {
        if (canBeInCycle(node) && canBeInCycle(target)) {
            if (CycleBudgetSetting.value === 0) {
                const cyclePath = this.findCyclePathSync(target, node);
                if (this.tryAddCycle(graph, cyclePath)) return;
            } else {
                const task = new CycleSearchTask(target, node);
                this.scheduler.schedule(
                    task,
                    (path) => {
                        if (
                            this.tryAddCycle(graph, path) &&
                            node.cycleRef !== null
                        ) {
                            this.refreshCycleIO(node.cycleRef);
                        }
                    },
                    target,
                );
                return;
            }
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

        for (let i = 0; i < node.backLinks.length; i++) {
            const ref = node.backLinks[i].cycleRef;
            if (
                ref !== null &&
                ref !== nodeCycleRef &&
                ref !== targetCycleRef
            ) {
                this.refreshCycleIO(ref);
            }
        }

        for (let i = 0; i < target.links.length; i++) {
            const ref = target.links[i].cycleRef;
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
        if (cycleDismantled || parentsDismantled) {
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

    public onNodeTypeChanged(graph: Graph, node: GraphNode): void {
        this.scheduler.cancel(node);

        const { backLinks, links } = node;
        for (let i = 0; i < backLinks.length; i++)
            this.scheduler.cancel(backLinks[i]);
        for (let i = 0; i < links.length; i++) this.scheduler.cancel(links[i]);

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

        dismantled =
            this.reevaluateParentCyclesTrack(graph, node) || dismantled;

        for (let i = 0; i < links.length; i++) {
            const ref = links[i].cycleRef;
            if (ref !== null && ref !== node.cycleRef) {
                if (!this.isValidCycle(ref.nodes)) {
                    graph.removeCycle(ref);
                    dismantled = true;
                } else {
                    this.refreshCycleIO(ref);
                }
            }
        }

        if (dismantled || (!node.isCycle && canBeInCycle(node))) {
            this.tryRebuildCycle(graph, node);
            for (let i = 0; i < links.length; i++) {
                this.tryRebuildCycle(graph, links[i]);
            }
        }

        this.updateCycleStatusIfActive(node);
        for (let i = 0; i < backLinks.length; i++)
            this.updateCycleStatusIfActive(backLinks[i]);
        for (let i = 0; i < links.length; i++)
            this.updateCycleStatusIfActive(links[i]);
    }

    public attachNodesToCycle(cycle: GraphCycle, nodes: GraphNode[]): void {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            node.isCycle = true;
            node.cycleRef = cycle;
        }
        this.refreshCycleIO(cycle);
    }

    public detachNodesFromCycle(cycle: GraphCycle): void {
        const { nodes, heads } = cycle;

        for (let i = 0; i < nodes.length; i++) {
            this.resetNodeCycleState(nodes[i]);
        }
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
