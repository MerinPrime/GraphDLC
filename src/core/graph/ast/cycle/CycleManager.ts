import type { Chunk } from '@logic-arrows/game-logic/chunk';
import {
    CycleHeadType,
    type GraphCycle,
    type HeadData,
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

const TASK_BUDGET_MS = 16;
const FLUSH_BUDGET_MS = 16;

export class CycleManager implements IGraphListener {
    private readonly scheduler = new AsyncScheduler(() => TASK_BUDGET_MS);
    private activeTask: CycleSearchTask | null = null;

    private readonly internalCycles = new Map<string, InternalCycle>();
    private readonly validationSet = new Set<GraphNode>();

    private readonly nodeToInternals = new Map<GraphNode, InternalCycle[]>();
    private readonly cycleToInternal = new Map<GraphCycle, InternalCycle>();

    private readonly dirtyNodes = new Set<GraphNode>();
    private readonly dirtyInternals = new Set<InternalCycle>();
    private flushQueued = false;
    private deferredQueued = false;
    private graph: Graph | null = null;
    private readonly walkedUp = new Set<GraphNode>();

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
        let visitedPath: Set<GraphNode> | null = null;

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

            if (visitedPath !== null) {
                if (visitedPath.has(current)) return null;
                visitedPath.add(current);
            } else if (distance >= 64) {
                visitedPath = new Set(extraPath);
                if (visitedPath.has(current)) return null;
                visitedPath.add(current);
            }

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

    public applyCycleIO(
        cycle: GraphCycle,
        heads: readonly HeadData[],
        graph?: Graph,
    ): void {
        const { heads: cycleHeads, extraNodes, nodes: cycleNodes } = cycle;

        const affected = graph ? new Set<GraphNode>() : null;
        if (affected) {
            for (let i = 0; i < cycleHeads.length; i++)
                affected.add(cycleHeads[i]);
            for (let i = 0; i < extraNodes.length; i++)
                affected.add(extraNodes[i]);
        }

        for (let i = 0; i < cycleHeads.length; i++) {
            this.resetNodeCycleInfo(cycleHeads[i]);
        }
        cycleHeads.length = 0;

        for (let i = 0; i < extraNodes.length; i++) {
            this.resetNodeCycleInfo(extraNodes[i]);
        }
        extraNodes.length = 0;

        const cycleLen = cycleNodes.length;
        for (let i = 0; i < cycleLen; i++) {
            const node = cycleNodes[cycleLen - i - 1];
            if (node.cycle !== null) {
                node.cycle.offset = i;
            }
        }

        for (let i = 0; i < heads.length; i++) {
            const h = heads[i];
            this.assignCycleHead(
                h.node,
                cycle,
                h.headType,
                h.offset,
                h.extraPath,
            );
        }

        if (graph && affected) {
            for (let i = 0; i < cycleHeads.length; i++)
                affected.add(cycleHeads[i]);
            for (let i = 0; i < extraNodes.length; i++)
                affected.add(extraNodes[i]);

            for (const node of affected) {
                graph.updater.update(node);
            }
        }
    }

    public refreshCycleIO(cycle: GraphCycle, graph?: Graph): void {
        const heads = this.validateAndExtractIO(cycle.nodes);
        if (heads !== null) {
            this.applyCycleIO(cycle, heads, graph);
        }
    }

    public validateAndExtractIO(cyclePath: GraphNode[]): HeadData[] | null {
        const cycleSet = this.validationSet;
        cycleSet.clear();

        const pathLen = cyclePath.length;
        for (let i = 0; i < pathLen; i++) {
            cycleSet.add(cyclePath[i]);
        }

        const heads: HeadData[] = [];

        try {
            for (let i = 0; i < pathLen; i++) {
                const cycleNode = cyclePath[i];
                const { links, backLinks: nodeBackLinks } = cycleNode;
                const revIdx = pathLen - i - 1;

                let hasCycleLink = false;

                for (let j = 0; j < links.length; j++) {
                    const neighbor = links[j];

                    if (!cycleSet.has(neighbor)) {
                        if (neighbor.type === NodeType.EMPTY) continue;

                        const readHead = this.findReadHead(neighbor, cycleSet);
                        if (readHead === null) return null;

                        const stepsToCheck = 1 + readHead.distance;
                        for (let step = 1; step <= stepsToCheck; step++) {
                            const checkNode = cyclePath[(i + step) % pathLen];
                            const { backLinks } = checkNode;
                            for (let k = 0; k < backLinks.length; k++) {
                                if (!cycleSet.has(backLinks[k])) {
                                    return null;
                                }
                            }
                        }

                        const offset =
                            (revIdx - readHead.distance + pathLen) % pathLen;
                        heads.push({
                            node: readHead.node,
                            headType: CycleHeadType.READ,
                            offset,
                            extraPath: readHead.extraPath,
                        });
                    } else {
                        if (hasCycleLink) return null;
                        hasCycleLink = true;
                    }
                }

                let hasWriteLink = false;

                for (let j = 0; j < nodeBackLinks.length; j++) {
                    const neighbor = nodeBackLinks[j];

                    if (!cycleSet.has(neighbor)) {
                        if (neighbor.links.length !== 1) return null;

                        const { type } = neighbor;
                        const isInvalidEntryPoint =
                            NodeTypes.isEntryPoint(type) ||
                            type === NodeType.RANDOM ||
                            type === NodeType.DELAY ||
                            type === NodeType.LATCH ||
                            type === NodeType.FLIP_FLOP;

                        if (isInvalidEntryPoint || hasWriteLink) return null;
                        hasWriteLink = true;

                        const offset = (revIdx + 1) % pathLen;
                        let headType = CycleHeadType.WRITE;

                        if (neighbor.type === NodeType.BLOCKER) {
                            headType = CycleHeadType.CLEAR;
                        } else if (cycleNode.type === NodeType.LOGIC_XOR) {
                            headType = CycleHeadType.XOR_WRITE;
                        }

                        heads.push({
                            node: neighbor,
                            headType,
                            offset,
                            extraPath: [],
                        });
                    }
                }
            }

            return heads;
        } finally {
            cycleSet.clear();
        }
    }

    public isValidCycle(cyclePath: GraphNode[]): boolean {
        return this.validateAndExtractIO(cyclePath) !== null;
    }

    private markNodeDirty(graph: Graph, node: GraphNode): void {
        this.graph = graph;
        this.dirtyNodes.add(node);
        this.scheduleFlush();
    }

    private scheduleFlush(): void {
        if (this.flushQueued) return;
        this.flushQueued = true;
        queueMicrotask(() => this.flush(FLUSH_BUDGET_MS));
    }

    private scheduleDeferredFlush(): void {
        if (this.deferredQueued) return;
        this.deferredQueued = true;
        setTimeout(() => {
            this.deferredQueued = false;
            this.flush(FLUSH_BUDGET_MS);
        }, 0);
    }

    public flush(budgetMs: number = Infinity): void {
        this.flushQueued = false;

        const graph = this.graph;
        if (graph === null) return;
        if (this.dirtyNodes.size === 0 && this.dirtyInternals.size === 0) {
            return;
        }

        const deadline =
            budgetMs === Infinity ? Infinity : performance.now() + budgetMs;

        if (this.dirtyNodes.size > 0) {
            const nodes = Array.from(this.dirtyNodes);
            this.dirtyNodes.clear();

            const hasCycles =
                this.internalCycles.size > 0 || this.cycleToInternal.size > 0;

            this.walkedUp.clear();
            for (let i = 0; i < nodes.length; i++) {
                if (hasCycles) this.collectAffected(nodes[i]);
                this.invalidateCluster(graph, nodes[i]);
            }
            this.walkedUp.clear();
        }

        this.revalidateDirty(graph, deadline);
    }

    public reevaluateAllCycles(graph: Graph): void {
        this.graph = graph;
        for (const internal of this.internalCycles.values()) {
            this.dirtyInternals.add(internal);
        }
        this.flush();
    }

    public flushSync(): void {
        while (
            this.dirtyNodes.size > 0 ||
            this.dirtyInternals.size > 0 ||
            this.activeTask !== null
        ) {
            this.flush(Infinity);
            if (this.activeTask !== null) {
                this.scheduler.forceComplete(this);
            }
            this.flush(Infinity);
        }
    }

    private revalidateDirty(graph: Graph, deadline: number): void {
        let count = 0;
        for (const internal of this.dirtyInternals) {
            this.dirtyInternals.delete(internal);

            if (this.internalCycles.get(internal.key) === internal) {
                if (this.isStructurallyIntact(internal)) {
                    this.processInternal(graph, internal);
                } else {
                    this.dropInternal(graph, internal);
                }
            }

            count++;
            if ((count & 15) === 0 && performance.now() > deadline) {
                this.scheduleDeferredFlush();
                return;
            }
        }
    }

    private processInternal(graph: Graph, internal: InternalCycle): void {
        if (this.internalCycles.get(internal.key) !== internal) return;

        if (this.hasOverlap(internal)) {
            internal.valid = false;
            this.deactivate(graph, internal);
            return;
        }

        const heads = this.validateAndExtractIO(internal.nodes);
        if (heads === null) {
            internal.valid = false;
            this.deactivate(graph, internal);
            return;
        }

        internal.valid = true;
        if (internal.graphCycleRef === null) {
            const cycle = graph.addCycle(internal.nodes, heads);
            internal.graphCycleRef = cycle;
            this.cycleToInternal.set(cycle, internal);
        } else {
            this.applyCycleIO(internal.graphCycleRef, heads, graph);
        }
    }

    private deactivate(graph: Graph, internal: InternalCycle): void {
        const ref = internal.graphCycleRef;
        if (ref === null) return;

        internal.graphCycleRef = null;
        graph.removeCycle(ref);
    }

    private dropInternal(graph: Graph, internal: InternalCycle): void {
        this.internalCycles.delete(internal.key);
        this.unindexInternal(internal);
        internal.valid = false;
        this.deactivate(graph, internal);
    }

    private isStructurallyIntact(internal: InternalCycle): boolean {
        const nodes = internal.nodes;
        const len = nodes.length;
        for (let i = 0; i < len; i++) {
            const current = nodes[i];
            if (!canBeInCycle(current)) return false;

            const next = nodes[(i + 1) % len];
            const links = current.links;
            let found = false;
            for (let j = 0; j < links.length; j++) {
                if (links[j] === next) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    private hasOverlap(internal: InternalCycle): boolean {
        const nodes = internal.nodes;
        for (let i = 0; i < nodes.length; i++) {
            const list = this.nodeToInternals.get(nodes[i]);
            if (list !== undefined && list.length > 1) return true;
        }
        return false;
    }

    private indexInternal(internal: InternalCycle): void {
        const nodes = internal.nodes;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            let list = this.nodeToInternals.get(node);
            if (list === undefined) {
                list = [];
                this.nodeToInternals.set(node, list);
            } else {
                for (let j = 0; j < list.length; j++) {
                    this.dirtyInternals.add(list[j]);
                }
            }
            list.push(internal);
        }
        this.dirtyInternals.add(internal);
    }

    private unindexInternal(internal: InternalCycle): void {
        const nodes = internal.nodes;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const list = this.nodeToInternals.get(node);
            if (list === undefined) continue;

            const idx = list.indexOf(internal);
            if (idx !== -1) list.splice(idx, 1);

            if (list.length === 0) {
                this.nodeToInternals.delete(node);
            } else {
                for (let j = 0; j < list.length; j++) {
                    this.dirtyInternals.add(list[j]);
                }
            }
        }
    }

    private collectAffected(node: GraphNode): void {
        this.markInternalsOf(node);

        const links = node.links;
        for (let i = 0; i < links.length; i++) {
            this.markInternalsOf(links[i]);
        }

        const back = node.backLinks;
        for (let i = 0; i < back.length; i++) {
            this.markInternalsOf(back[i]);
            this.walkUpstream(back[i]);
        }

        this.walkUpstream(node);
    }

    private walkUpstream(from: GraphNode): void {
        let current = from;
        while (true) {
            if (
                current.type !== NodeType.PATH &&
                current.type !== NodeType.DETECTOR
            ) {
                return;
            }
            if (this.walkedUp.has(current)) return;
            this.walkedUp.add(current);

            if (current.backLinks.length !== 1) return;

            const prev = current.backLinks[0];
            this.markInternalsOf(prev);
            current = prev;
        }
    }

    private markInternalsOf(node: GraphNode): void {
        const list = this.nodeToInternals.get(node);
        if (list !== undefined) {
            for (let i = 0; i < list.length; i++) {
                this.dirtyInternals.add(list[i]);
            }
        }

        const ref = node.cycle?.ref;
        if (ref !== undefined) {
            const internal = this.cycleToInternal.get(ref);
            if (internal !== undefined) this.dirtyInternals.add(internal);
        }
    }

    private handleCycleCandidate(graph: Graph, path: GraphNode[]): void {
        if (path.length < 2) return;

        const key = this.getCycleKey(path);
        if (this.internalCycles.has(key)) return;

        const internal: InternalCycle = {
            key,
            nodes: path,
            graphCycleRef: null,
            valid: false,
        };
        this.internalCycles.set(key, internal);
        this.indexInternal(internal);

        this.graph = graph;
        this.scheduleFlush();
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
        this.markNodeDirty(graph, node);
        this.markNodeDirty(graph, target);
    }

    public onLinkRemoved(
        graph: Graph,
        fromNode: GraphNode,
        toNode: GraphNode,
    ): void {
        this.markNodeDirty(graph, fromNode);
        this.markNodeDirty(graph, toNode);
    }

    public onNodeTypeChanged(graph: Graph, node: GraphNode): void {
        this.markNodeDirty(graph, node);
    }

    public onCycleAdded(_graph: Graph, cycle: GraphCycle): void {
        let internal = this.cycleToInternal.get(cycle);
        if (!internal) {
            const key = this.getCycleKey(cycle.nodes);
            internal = this.internalCycles.get(key);
            if (internal) {
                internal.graphCycleRef = cycle;
                this.cycleToInternal.set(cycle, internal);
            }
        } else {
            internal.graphCycleRef = cycle;
        }
    }

    public onCycleRemoved(_graph: Graph, cycle: GraphCycle): void {
        this.cycleToInternal.delete(cycle);

        const key = this.getCycleKey(cycle.nodes);
        const internal = this.internalCycles.get(key);
        if (internal && internal.graphCycleRef === cycle) {
            internal.graphCycleRef = null;
        }
    }

    public attachNodesToCycle(
        cycle: GraphCycle,
        nodes: GraphNode[],
        heads?: HeadData[],
    ): void {
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].cycle = {
                ref: cycle,
                headType: CycleHeadType.NONE,
                offset: 0,
                isBody: true,
            };
        }

        if (heads !== undefined) {
            this.applyCycleIO(cycle, heads);
        } else {
            this.refreshCycleIO(cycle);
        }
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
        this.nodeToInternals.clear();
        this.cycleToInternal.clear();
        this.dirtyNodes.clear();
        this.dirtyInternals.clear();
        this.walkedUp.clear();
        this.graph = null;
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
