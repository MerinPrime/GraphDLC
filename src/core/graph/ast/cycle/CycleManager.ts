import type { Chunk } from '@logic-arrows/game-logic/chunk';
import {
    CycleHeadType,
    type GraphCycle,
    type InternalCycle,
    type ReadHead,
} from 'src/core/graph/ast/cycle/types';
import { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import { NodeType, NodeTypes } from '../../engines/core/NodeType';
import type { Graph } from '../Graph';
import type { GraphNode } from '../GraphNode';
import type { IGraphListener } from '../IGraphListener';
import { CycleSearchTask } from './CycleSearchTask';
import { canBeInCycle } from './utils';

export class CycleManager implements IGraphListener {
    private readonly scheduler = new AsyncScheduler(() => 16);
    private activeTask: CycleSearchTask | null = null;

    private readonly internalCycles = new Map<string, InternalCycle>();
    private readonly validationSet = new Set<GraphNode>();

    private getOrCreateTask(graph: Graph): CycleSearchTask {
        if (this.activeTask === null) {
            this.activeTask = new CycleSearchTask(
                (path) => this.handleCycleCandidate(graph, path),
                () => {
                    this.activeTask = null;
                },
            );
            this.scheduler.schedule(this.activeTask, () => {}, this);
        }
        return this.activeTask;
    }

    public getCycleKey(path: readonly GraphNode[]): string {
        const len = path.length;
        let minIdx = 0;
        let minVal = path[0].nodeIdx;

        for (let i = 1; i < len; i++) {
            if (path[i].nodeIdx < minVal) {
                minVal = path[i].nodeIdx;
                minIdx = i;
            }
        }

        let key = '';
        for (let i = 0; i < len; i++) {
            const node = path[(minIdx + i) % len];
            key += `${node.nodeIdx}>`;
        }
        return key;
    }

    private resetNodeCycleInfo(node: GraphNode): void {
        node.cycle = null;
    }

    private assignCycleHead(
        headNode: GraphNode,
        cycle: GraphCycle,
        headType: CycleHeadType,
        offset: number,
        extraPath: GraphNode[] = [],
    ): void {
        headNode.cycle = {
            ref: cycle,
            headType,
            offset,
            isBody: false,
        };
        cycle.heads.push(headNode);

        const cycleLen = cycle.nodes.length;
        const pathLen = extraPath.length;

        for (let i = 0; i < pathLen; i++) {
            const extraNode = extraPath[i];
            const rawOffset = offset + pathLen - i - 1;
            const normalizedOffset =
                ((rawOffset % cycleLen) + cycleLen) % cycleLen;

            extraNode.cycle = {
                ref: cycle,
                headType: CycleHeadType.NONE,
                offset: normalizedOffset,
                isBody: false,
            };

            cycle.extraNodes.push(extraNode);
        }
    }

    private findReadHead(
        node: GraphNode,
        cycleSet: Set<GraphNode>,
    ): ReadHead | null {
        let current = node;
        let distance = 0;
        const extraPath: GraphNode[] = [];
        const visitedPath = new Set<GraphNode>();

        while (
            current.type === NodeType.PATH ||
            current.type === NodeType.DETECTOR
        ) {
            if (current.links.length !== 1) return null;
            if (
                current.backLinks.length !== 1 &&
                current.type === NodeType.PATH
            )
                return null;

            const next = current.links[0];
            if (cycleSet.has(next)) return null;

            if (visitedPath.has(current)) {
                return null;
            }
            visitedPath.add(current);

            extraPath.push(current);
            current = next;
            distance++;
        }

        if (current.type !== NodeType.LOGIC_AND) {
            return null;
        }

        return {
            node: current,
            extraPath,
            distance,
        };
    }

    public refreshCycleIO(cycle: GraphCycle, graph?: Graph): void {
        const { heads, extraNodes, nodes: cycleNodes } = cycle;

        const affectedNodesToUpdate: GraphNode[] = [];
        if (graph) {
            for (let i = 0; i < heads.length; i++) {
                affectedNodesToUpdate.push(heads[i]);
            }
            for (let i = 0; i < extraNodes.length; i++) {
                affectedNodesToUpdate.push(extraNodes[i]);
            }
        }

        for (let i = 0; i < heads.length; i++) {
            this.resetNodeCycleInfo(heads[i]);
        }
        heads.length = 0;

        for (let i = 0; i < extraNodes.length; i++) {
            this.resetNodeCycleInfo(extraNodes[i]);
        }
        extraNodes.length = 0;

        const cycleSet = this.validationSet;
        cycleSet.clear();

        const cycleLen = cycleNodes.length;
        for (let i = 0; i < cycleLen; i++) {
            cycleSet.add(cycleNodes[i]);
        }

        try {
            for (let i = 0; i < cycleLen; i++) {
                const node = cycleNodes[cycleLen - i - 1];
                if (node.cycle !== null) {
                    node.cycle.offset = i;
                }

                for (let j = 0; j < node.links.length; j++) {
                    const linkedNode = node.links[j];
                    if (cycleSet.has(linkedNode)) continue;

                    const readHead = this.findReadHead(linkedNode, cycleSet);
                    if (readHead !== null) {
                        const offset =
                            (i - readHead.distance + cycleLen) % cycleLen;
                        this.assignCycleHead(
                            readHead.node,
                            cycle,
                            CycleHeadType.READ,
                            offset,
                            readHead.extraPath,
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

        if (graph) {
            for (let i = 0; i < heads.length; i++) {
                affectedNodesToUpdate.push(heads[i]);
            }
            for (let i = 0; i < extraNodes.length; i++) {
                affectedNodesToUpdate.push(extraNodes[i]);
            }

            for (let i = 0; i < affectedNodesToUpdate.length; i++) {
                graph.updater.update(affectedNodesToUpdate[i]);
            }
        }
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
                if (!this.validateNodeIO(cyclePath, i, cycleSet)) {
                    return false;
                }
            }
            return true;
        } finally {
            cycleSet.clear();
        }
    }

    private validateNodeIO(
        cyclePath: GraphNode[],
        nodeIndex: number,
        cycleSet: Set<GraphNode>,
    ): boolean {
        const cycleNode = cyclePath[nodeIndex];
        const pathLen = cyclePath.length;
        const { links, backLinks: nodeBackLinks } = cycleNode;

        let hasCycleLink = false;

        for (let j = 0; j < links.length; j++) {
            const neighbor = links[j];

            if (!cycleSet.has(neighbor)) {
                if (neighbor.type === NodeType.EMPTY) continue;

                const readHead = this.findReadHead(neighbor, cycleSet);
                if (readHead === null) return false;

                const stepsToCheck = 1 + readHead.distance;
                for (let step = 1; step <= stepsToCheck; step++) {
                    const checkNode = cyclePath[(nodeIndex + step) % pathLen];
                    const { backLinks } = checkNode;
                    for (let k = 0; k < backLinks.length; k++) {
                        if (!cycleSet.has(backLinks[k])) {
                            return false;
                        }
                    }
                }
            } else {
                if (hasCycleLink) return false;
                hasCycleLink = true;
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

    public reevaluateAllCycles(graph: Graph): void {
        const nodeUsageCount = new Map<GraphNode, number>();

        for (const internal of this.internalCycles.values()) {
            for (let i = 0; i < internal.nodes.length; i++) {
                const node = internal.nodes[i];
                nodeUsageCount.set(node, (nodeUsageCount.get(node) ?? 0) + 1);
            }
        }

        const toDeactivate: InternalCycle[] = [];
        const toActivate: InternalCycle[] = [];

        for (const internal of this.internalCycles.values()) {
            let overlaps = false;
            for (let i = 0; i < internal.nodes.length; i++) {
                if ((nodeUsageCount.get(internal.nodes[i]) ?? 0) > 1) {
                    overlaps = true;
                    break;
                }
            }

            const shouldBeValid =
                !overlaps && this.isValidCycle(internal.nodes);

            if (internal.valid !== shouldBeValid) {
                internal.valid = shouldBeValid;
                if (shouldBeValid) {
                    toActivate.push(internal);
                } else {
                    toDeactivate.push(internal);
                }
            } else if (shouldBeValid && internal.graphCycleRef !== null) {
                toActivate.push(internal);
            }
        }

        for (let i = 0; i < toDeactivate.length; i++) {
            const internal = toDeactivate[i];
            if (internal.graphCycleRef !== null) {
                const cycleRef = internal.graphCycleRef;
                internal.graphCycleRef = null;
                graph.removeCycle(cycleRef);
            }

            for (let j = 0; j < internal.nodes.length; j++) {
                this.resetNodeCycleInfo(internal.nodes[j]);
            }
        }

        for (let i = 0; i < toActivate.length; i++) {
            const internal = toActivate[i];
            if (internal.graphCycleRef === null) {
                graph.addCycle(internal.nodes);
            } else {
                this.refreshCycleIO(internal.graphCycleRef, graph);
            }
        }
    }

    private handleCycleCandidate(graph: Graph, path: GraphNode[]): void {
        const len = path.length;
        if (len < 2) return;

        for (let i = 0; i < len; i++) {
            const current = path[i];
            const next = path[(i + 1) % len];
            if (!canBeInCycle(current) || !current.links.includes(next)) {
                return;
            }
        }

        const key = this.getCycleKey(path);
        if (this.internalCycles.has(key)) {
            return;
        }

        this.internalCycles.set(key, {
            key,
            nodes: path,
            graphCycleRef: null,
            valid: false,
        });

        this.reevaluateAllCycles(graph);
    }

    public invalidateCluster(graph: Graph, root: GraphNode): void {
        if (!canBeInCycle(root)) return;

        const task = this.getOrCreateTask(graph);
        task.pushCandidate(root);

        for (let i = 0; i < root.links.length; i++) {
            const next = root.links[i];
            if (canBeInCycle(next)) task.pushCandidate(next);
        }
        for (let i = 0; i < root.backLinks.length; i++) {
            const prev = root.backLinks[i];
            if (canBeInCycle(prev)) task.pushCandidate(prev);
        }
    }

    public onLinkAdded(graph: Graph, node: GraphNode, target: GraphNode): void {
        this.invalidateCluster(graph, node);
        this.invalidateCluster(graph, target);
        this.reevaluateAllCycles(graph);
    }

    public onLinkRemoved(
        graph: Graph,
        fromNode: GraphNode,
        toNode: GraphNode,
    ): void {
        const keysToRemove: string[] = [];

        for (const [key, internal] of this.internalCycles.entries()) {
            const nodes = internal.nodes;
            const len = nodes.length;

            for (let i = 0; i < len; i++) {
                if (nodes[i] === fromNode && nodes[(i + 1) % len] === toNode) {
                    keysToRemove.push(key);
                    if (internal.graphCycleRef !== null) {
                        const ref = internal.graphCycleRef;
                        internal.graphCycleRef = null;
                        graph.removeCycle(ref);
                    }

                    for (let j = 0; j < nodes.length; j++) {
                        this.resetNodeCycleInfo(nodes[j]);
                    }
                    break;
                }
            }
        }

        for (let i = 0; i < keysToRemove.length; i++) {
            this.internalCycles.delete(keysToRemove[i]);
        }

        this.reevaluateAllCycles(graph);
        this.invalidateCluster(graph, fromNode);
        this.invalidateCluster(graph, toNode);
    }

    public onNodeTypeChanged(graph: Graph, node: GraphNode): void {
        if (!canBeInCycle(node)) {
            const keysToRemove: string[] = [];

            for (const [key, internal] of this.internalCycles.entries()) {
                if (internal.nodes.includes(node)) {
                    keysToRemove.push(key);
                    if (internal.graphCycleRef !== null) {
                        graph.removeCycle(internal.graphCycleRef);
                    }
                }
            }

            for (let i = 0; i < keysToRemove.length; i++) {
                this.internalCycles.delete(keysToRemove[i]);
            }
        }

        this.reevaluateAllCycles(graph);
        this.invalidateCluster(graph, node);
    }

    public onCycleAdded(_graph: Graph, cycle: GraphCycle): void {
        const key = this.getCycleKey(cycle.nodes);
        const internal = this.internalCycles.get(key);
        if (internal) {
            internal.graphCycleRef = cycle;
        }
    }

    public onCycleRemoved(_graph: Graph, cycle: GraphCycle): void {
        const key = this.getCycleKey(cycle.nodes);
        const internal = this.internalCycles.get(key);
        if (internal) {
            internal.graphCycleRef = null;
        }
    }

    public attachNodesToCycle(cycle: GraphCycle, nodes: GraphNode[]): void {
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].cycle = {
                ref: cycle,
                headType: CycleHeadType.NONE,
                offset: 0,
                isBody: true,
            };
        }

        this.refreshCycleIO(cycle);
    }

    public detachNodesFromCycle(cycle: GraphCycle): void {
        const { nodes, heads, extraNodes } = cycle;

        for (let i = 0; i < nodes.length; i++) {
            this.resetNodeCycleInfo(nodes[i]);
        }

        for (let i = 0; i < heads.length; i++) {
            this.resetNodeCycleInfo(heads[i]);
        }

        for (let i = 0; i < extraNodes.length; i++) {
            this.resetNodeCycleInfo(extraNodes[i]);
        }
    }

    public onGraphClear(_graph: Graph): void {
        this.scheduler.clear();
        this.internalCycles.clear();
        if (this.activeTask !== null) {
            this.activeTask.clear();
            this.activeTask = null;
        }
    }

    public onChunkAdded(
        _graph: Graph,
        _chunk: Chunk,
        _chunkIdx: number,
    ): void {}
    public onNodeAdded(_graph: Graph, _node: GraphNode): void {}
}
