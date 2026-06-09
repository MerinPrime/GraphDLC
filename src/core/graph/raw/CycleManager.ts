import { ArrowType, IsArrowPath } from 'src/core/utils/ArrowType';
import { CycleHeadType, type RawCycle } from './CycleTypes';
import type { RawGraph } from './RawGraph';
import type { RawNode } from './RawNode';

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

function canBeInCycle(node: RawNode): boolean {
    return ALLOWED_IN_CYCLE.has(node.arrow.type);
}

export class CycleManager {
    private graph: RawGraph;

    public constructor(graph: RawGraph) {
        this.graph = graph;
    }

    public dismantleCycle(cycle: RawCycle) {
        this.graph.graphUpdater.onCycleDismantle(this.graph.graphState, cycle);

        for (const node of cycle.nodes) {
            node.isCycle = false;
            node.cycleRef = null;
            node.headType = CycleHeadType.NONE;
            node.cycleOffset = 0;
        }
        cycle.heads.forEach((head) => {
            head.ioCycle = null;
            head.headType = CycleHeadType.NONE;
            head.cycleOffset = 0;
            if (this.graph.graphState.nodes[head.index]) {
                this.graph.graphState.nodes[head.index].nodeInCycleOffset = 0;
            }
        });

        this.graph.removeCycle(cycle);
    }

    public refreshCycleIO(cycle: RawCycle) {
        cycle.heads.forEach((head) => {
            head.ioCycle = null;
            head.headType = CycleHeadType.NONE;
            head.cycleOffset = 0;
            if (this.graph.graphState.nodes[head.index]) {
                this.graph.graphState.nodes[head.index].nodeInCycleOffset = 0;
            }
        });
        cycle.heads.length = 0;

        const cycleSet = new Set(cycle.nodes);

        for (let i = 0; i < cycle.nodes.length; i++) {
            const node = cycle.nodes[cycle.nodes.length - i - 1];
            node.cycleOffset = i;
            node.origCycleOffset = i;
            if (this.graph.graphState.nodes[node.index]) {
                this.graph.graphState.nodes[node.index].nodeInCycleOffset =
                    node.cycleOffset;
            }

            for (const nextNode of node.next) {
                if (
                    nextNode.arrow.type === ArrowType.LOGIC_AND &&
                    !cycleSet.has(nextNode)
                ) {
                    nextNode.ioCycle = cycle;
                    nextNode.headType = CycleHeadType.READ;
                    nextNode.cycleOffset = (i + 1) % cycle.nodes.length;
                    if (this.graph.graphState.nodes[nextNode.index]) {
                        this.graph.graphState.nodes[
                            nextNode.index
                        ].nodeInCycleOffset = nextNode.cycleOffset;
                    }
                    cycle.heads.push(nextNode);
                }
            }
            for (const prevNode of node.previous) {
                if (!cycleSet.has(prevNode)) {
                    if (prevNode.arrow.type === ArrowType.BLOCKER) {
                        prevNode.ioCycle = cycle;
                        prevNode.headType = CycleHeadType.CLEAR;
                        prevNode.cycleOffset = (i + 1) % cycle.nodes.length;
                        if (this.graph.graphState.nodes[prevNode.index]) {
                            this.graph.graphState.nodes[
                                prevNode.index
                            ].nodeInCycleOffset = prevNode.cycleOffset;
                        }
                        cycle.heads.push(prevNode);
                    } else if (node.arrow.type === ArrowType.LOGIC_XOR) {
                        prevNode.ioCycle = cycle;
                        prevNode.headType = CycleHeadType.XOR_WRITE;
                        prevNode.cycleOffset = (i + 1) % cycle.nodes.length;
                        if (this.graph.graphState.nodes[prevNode.index]) {
                            this.graph.graphState.nodes[
                                prevNode.index
                            ].nodeInCycleOffset = prevNode.cycleOffset;
                        }
                        cycle.heads.push(prevNode);
                    } else if (IsArrowPath(prevNode.arrow.type)) {
                        prevNode.ioCycle = cycle;
                        prevNode.headType = CycleHeadType.WRITE;
                        prevNode.cycleOffset = (i + 1) % cycle.nodes.length;
                        if (this.graph.graphState.nodes[prevNode.index]) {
                            this.graph.graphState.nodes[
                                prevNode.index
                            ].nodeInCycleOffset = prevNode.cycleOffset;
                        }
                        cycle.heads.push(prevNode);
                    }
                }
            }
        }
    }

    public buildAndAssignCycle(cyclePath: RawNode[]): RawCycle {
        const rawCycle = this.graph.addCycle(cyclePath);

        for (const n of cyclePath) {
            n.isCycle = true;
            n.cycleRef = rawCycle;
        }

        this.refreshCycleIO(rawCycle);

        this.graph.graphState.update(this.graph);

        this.graph.graphUpdater.onCycleBuild(this.graph.graphState, rawCycle);

        return rawCycle;
    }

    public tryRebuildCycle(startNode: RawNode) {
        if (startNode.cycleRef !== null || !canBeInCycle(startNode)) {
            return;
        }

        const cyclePath = this.findCyclePath(startNode, startNode);
        if (cyclePath !== null && this.isValidCycle(cyclePath)) {
            this.buildAndAssignCycle(cyclePath);
        }
    }

    public reevaluateParentCycles(node: RawNode) {
        for (const parent of node.previous) {
            if (
                parent.cycleRef !== null &&
                !this.isValidCycle(parent.cycleRef.nodes)
            ) {
                this.dismantleCycle(parent.cycleRef);
            }

            if (parent.cycleRef !== null) {
                this.refreshCycleIO(parent.cycleRef);
            } else {
                this.tryRebuildCycle(parent);
            }
        }
    }

    public isValidCycle(cyclePath: RawNode[]): boolean {
        const cycleSet = new Set<RawNode>(cyclePath);

        for (const cycleNode of cyclePath) {
            let moreThanOneNext = false;
            for (const neighbor of cycleNode.next) {
                if (!cycleSet.has(neighbor)) {
                    if (
                        neighbor.arrow.type !== ArrowType.EMPTY &&
                        neighbor.arrow.type !== ArrowType.LOGIC_AND
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
                    if (
                        !IsArrowPath(neighbor.arrow.type) &&
                        neighbor.arrow.type !== ArrowType.LOGIC_AND &&
                        neighbor.arrow.type !== ArrowType.BLOCKER
                    )
                        return false;
                    if (moreThanOneWrite) return false;
                    moreThanOneWrite = true;
                }
            }
        }

        return true;
    }

    public findCyclePath(
        startNode: RawNode,
        targetNode: RawNode,
    ): RawNode[] | null {
        const queue: RawNode[] = [];
        let head = 0;
        const visited = new Set<RawNode>();
        const parentMap = new Map<RawNode, RawNode>();

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
                    const path: RawNode[] = [targetNode];
                    let curr: RawNode | undefined = current;

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

    public updateCycleStatusAfterRemoval(startNode: RawNode) {
        const isStillInCycle =
            this.findCyclePath(startNode, startNode) !== null;

        if (!isStillInCycle) {
            const queue: RawNode[] = [startNode];
            let head = 0;
            const visited = new Set<RawNode>([startNode]);
            startNode.isCycle = false;

            while (head < queue.length) {
                const current = queue[head++];
                const neighbors = [...current.next, ...current.previous];

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
            }
        }
    }

    public onAddNext(node: RawNode, target: RawNode) {
        if (canBeInCycle(node) && canBeInCycle(target)) {
            const cyclePath = this.findCyclePath(target, node);

            if (cyclePath !== null && this.isValidCycle(cyclePath)) {
                this.buildAndAssignCycle(cyclePath);
                return;
            }
        }

        if (node.cycleRef !== null) {
            if (!this.isValidCycle(node.cycleRef.nodes)) {
                this.dismantleCycle(node.cycleRef);
            } else {
                this.refreshCycleIO(node.cycleRef);
            }
        }

        if (target.cycleRef !== null && target.cycleRef !== node.cycleRef) {
            if (!this.isValidCycle(target.cycleRef.nodes)) {
                this.dismantleCycle(target.cycleRef);
            } else {
                this.refreshCycleIO(target.cycleRef);
            }
        }

        for (const prev of node.previous) {
            if (
                prev.cycleRef &&
                prev.cycleRef !== node.cycleRef &&
                prev.cycleRef !== target.cycleRef
            ) {
                this.refreshCycleIO(prev.cycleRef);
            }
        }
        for (const next of target.next) {
            if (
                next.cycleRef &&
                next.cycleRef !== node.cycleRef &&
                next.cycleRef !== target.cycleRef
            ) {
                this.refreshCycleIO(next.cycleRef);
            }
        }

        this.tryRebuildCycle(node);
        this.tryRebuildCycle(target);
    }

    public onRemoveNext(node: RawNode, target: RawNode) {
        if (node.cycleRef !== null && target.cycleRef === node.cycleRef) {
            this.dismantleCycle(node.cycleRef);
        }

        this.reevaluateParentCycles(node);

        this.tryRebuildCycle(node);
        this.tryRebuildCycle(target);

        if (node.isCycle) {
            this.updateCycleStatusAfterRemoval(node);
        }
        if (target.isCycle) {
            this.updateCycleStatusAfterRemoval(target);
        }

        if (node.cycleRef !== null) {
            this.refreshCycleIO(node.cycleRef);
        }
        if (target.cycleRef !== null && target.cycleRef !== node.cycleRef) {
            this.refreshCycleIO(target.cycleRef);
        }
    }

    public onClearNext(node: RawNode, oldNext: RawNode[]) {
        if (node.cycleRef !== null) {
            this.dismantleCycle(node.cycleRef);
        }

        this.reevaluateParentCycles(node);

        this.tryRebuildCycle(node);
        for (const oldNode of oldNext) {
            this.tryRebuildCycle(oldNode);
        }

        if (node.isCycle) {
            this.updateCycleStatusAfterRemoval(node);
        }
        for (const oldNode of oldNext) {
            if (oldNode.isCycle) {
                this.updateCycleStatusAfterRemoval(oldNode);
            }
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
}
