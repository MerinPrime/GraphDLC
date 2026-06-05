import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import { ArrowType, IsArrowPath } from 'src/core/utils/ArrowType';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';

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

export const enum CycleHeadType {
    READ = 0,
    WRITE = 1,
    CLEAR = 2,
    XOR_WRITE = 3,
}

export interface RawCycle {
    nodes: RawNode[];
    heads: RawNode[];
}

export class RawNode {
    arrow: Arrow;
    chunk: Chunk;
    index: number;
    globalX: number;
    globalY: number;
    localX: number;
    localY: number;
    valid: boolean;

    next: RawNode[];
    previous: RawNode[];
    detectedNode: RawNode | null;

    isCycle: boolean;
    cycleRef: RawCycle | null;
    ioCycle: RawCycle | null;
    headType: CycleHeadType;

    constructor(
        arrow: Arrow,
        index: number,
        chunk: Chunk,
        globalX: number,
        globalY: number,
    ) {
        this.arrow = arrow;
        this.chunk = chunk;
        this.index = index;
        this.globalX = globalX;
        this.globalY = globalY;
        this.localX = globalX - chunk.x * CHUNK_SIZE;
        this.localY = globalY - chunk.y * CHUNK_SIZE;
        this.valid = false;
        this.next = [];
        this.previous = [];
        this.detectedNode = null;

        this.isCycle = false;
        this.cycleRef = null;
        this.ioCycle = null;
        this.headType = CycleHeadType.READ;
    }

    private dismantleCycle(cyclePath: RawCycle) {
        for (const node of cyclePath.nodes) {
            node.isCycle = false;
            node.cycleRef = null;
        }
    }

    private refreshCycleIO(cycle: RawCycle) {
        cycle.heads.forEach((head) => (head.ioCycle = null));
        cycle.heads.length = 0;

        const cycleSet = new Set(cycle.nodes);

        for (const node of cycle.nodes) {
            for (const nextNode of node.next) {
                if (
                    nextNode.arrow.type === ArrowType.LOGIC_AND &&
                    !cycleSet.has(nextNode)
                ) {
                    nextNode.headType = CycleHeadType.READ;
                    cycle.heads.push(nextNode);
                }
            }
            for (const prevNode of node.previous) {
                if (!cycleSet.has(prevNode)) {
                    if (prevNode.arrow.type === ArrowType.BLOCKER) {
                        prevNode.headType = CycleHeadType.CLEAR;
                        cycle.heads.push(prevNode);
                    } else if (node.arrow.type === ArrowType.LOGIC_XOR) {
                        prevNode.headType = CycleHeadType.XOR_WRITE;
                        cycle.heads.push(prevNode);
                    } else {
                        prevNode.headType = CycleHeadType.WRITE;
                        cycle.heads.push(prevNode);
                    }
                }
            }
        }
    }

    private buildAndAssignCycle(cyclePath: RawNode[]): RawCycle {
        const rawCycle: RawCycle = {
            nodes: cyclePath,
            heads: [],
        };

        for (const n of cyclePath) {
            n.isCycle = true;
            n.cycleRef = rawCycle;
        }

        this.refreshCycleIO(rawCycle);
        return rawCycle;
    }

    private tryRebuildCycle(startNode: RawNode) {
        if (startNode.cycleRef !== null || !canBeInCycle(startNode)) {
            return;
        }

        const cyclePath = this.findCyclePath(startNode, startNode);
        if (cyclePath !== null && this.isValidCycle(cyclePath)) {
            this.buildAndAssignCycle(cyclePath);
        }
    }

    private reevaluateParentCycles() {
        for (const parent of this.previous) {
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

    clearNext() {
        const oldNext = [...this.next];
        const detectors: RawNode[] = [];

        if (this.cycleRef !== null) {
            this.dismantleCycle(this.cycleRef);
        }

        for (const nextNode of oldNext) {
            removeWithSwap(nextNode.previous, this);
            if (nextNode.detectedNode === this) detectors.push(nextNode);
        }
        this.next.length = 0;

        this.reevaluateParentCycles();

        this.tryRebuildCycle(this);
        for (const oldNode of oldNext) {
            this.tryRebuildCycle(oldNode);
        }

        if (this.isCycle) {
            this.updateCycleStatusAfterRemoval(this);
        }
        for (const oldNode of oldNext) {
            if (oldNode.isCycle) {
                this.updateCycleStatusAfterRemoval(oldNode);
            }
            if (
                oldNode.cycleRef !== null &&
                oldNode.cycleRef !== this.cycleRef
            ) {
                this.refreshCycleIO(oldNode.cycleRef);
            }
        }

        if (this.cycleRef !== null) {
            this.refreshCycleIO(this.cycleRef);
        }

        for (const detector of detectors) {
            this.addNext(detector);
        }
    }

    removeNext(node: RawNode) {
        if (this.cycleRef !== null && node.cycleRef === this.cycleRef) {
            this.dismantleCycle(this.cycleRef);
        }

        removeWithSwap(this.next, node);
        removeWithSwap(node.previous, this);

        this.reevaluateParentCycles();

        this.tryRebuildCycle(this);
        this.tryRebuildCycle(node);

        if (this.isCycle) {
            this.updateCycleStatusAfterRemoval(this);
        }
        if (node.isCycle) {
            this.updateCycleStatusAfterRemoval(node);
        }

        if (this.cycleRef !== null) {
            this.refreshCycleIO(this.cycleRef);
        }
        if (node.cycleRef !== null && node.cycleRef !== this.cycleRef) {
            this.refreshCycleIO(node.cycleRef);
        }
    }

    addNext(node: RawNode): RawNode[] | null {
        if (canBeInCycle(this) && canBeInCycle(node)) {
            const cyclePath = this.findCyclePath(node, this);

            if (cyclePath !== null && this.isValidCycle(cyclePath)) {
                this.next.push(node);
                node.previous.push(this);

                this.buildAndAssignCycle(cyclePath);
                return cyclePath;
            }
        }

        this.next.push(node);
        node.previous.push(this);

        if (this.cycleRef !== null) {
            if (!this.isValidCycle(this.cycleRef.nodes)) {
                this.dismantleCycle(this.cycleRef);
            } else {
                this.refreshCycleIO(this.cycleRef);
            }
        }

        if (node.cycleRef !== null && node.cycleRef !== this.cycleRef) {
            if (!this.isValidCycle(node.cycleRef.nodes)) {
                this.dismantleCycle(node.cycleRef);
            } else {
                this.refreshCycleIO(node.cycleRef);
            }
        }

        this.tryRebuildCycle(this);
        this.tryRebuildCycle(node);

        return null;
    }

    private isValidCycle(cyclePath: RawNode[]): boolean {
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
                    if (
                        !IsArrowPath(neighbor.arrow.type) &&
                        neighbor.arrow.type !== ArrowType.LOGIC_AND && // TODO: check XOR/NOT etc
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

    private findCyclePath(
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

    private updateCycleStatusAfterRemoval(startNode: RawNode) {
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
}
