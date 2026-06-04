import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import { ArrowType } from 'src/core/utils/ArrowType';
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
    cycleRef: RawNode[] | null;

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
    }

    private dismantleCycle(cyclePath: RawNode[]) {
        for (let i = 0; i < cyclePath.length; i++) {
            cyclePath[i].isCycle = false;
            cyclePath[i].cycleRef = null;
        }
    }

    clearNext() {
        const oldNext = [...this.next];
        const detectors: RawNode[] = [];

        if (this.cycleRef !== null) {
            this.dismantleCycle(this.cycleRef);
        }

        this.next.forEach((nextNode) => {
            if (this.cycleRef !== null && nextNode.cycleRef === this.cycleRef) {
                this.dismantleCycle(this.cycleRef);
            }

            removeWithSwap(nextNode.previous, this);
            if (nextNode.detectedNode === this) detectors.push(nextNode);
        });
        this.next.length = 0;

        this.previous.forEach((parent) => {
            if (parent.cycleRef !== null) {
                if (!this.isValidCycle(parent.cycleRef)) {
                    this.dismantleCycle(parent.cycleRef);
                }
            }
            const cyclePath = this.findCyclePath(parent, parent);
            if (cyclePath !== null && this.isValidCycle(cyclePath)) {
                cyclePath.forEach((n) => {
                    n.isCycle = true;
                    n.cycleRef = cyclePath;
                });
            }
        });

        if (this.isCycle) {
            this.updateCycleStatusAfterRemoval(this);
        }
        for (let i = 0; i < oldNext.length; i++) {
            if (oldNext[i].isCycle) {
                this.updateCycleStatusAfterRemoval(oldNext[i]);
            }
        }

        detectors.forEach((detector) => this.addNext(detector));
    }

    removeNext(node: RawNode) {
        if (this.cycleRef !== null && node.cycleRef === this.cycleRef) {
            this.dismantleCycle(this.cycleRef);
        }

        removeWithSwap(this.next, node);
        removeWithSwap(node.previous, this);

        this.previous.forEach((parent) => {
            if (parent.cycleRef !== null) {
                if (!this.isValidCycle(parent.cycleRef)) {
                    this.dismantleCycle(parent.cycleRef);
                }
            }
            const cyclePath = this.findCyclePath(parent, parent);
            if (cyclePath !== null && this.isValidCycle(cyclePath)) {
                cyclePath.forEach((n) => {
                    n.isCycle = true;
                    n.cycleRef = cyclePath;
                });
            }
        });

        if (this.isCycle) {
            this.updateCycleStatusAfterRemoval(this);
        }
        if (node.isCycle) {
            this.updateCycleStatusAfterRemoval(node);
        }
    }

    addNext(node: RawNode): RawNode[] | null {
        if (canBeInCycle(this) && canBeInCycle(node)) {
            const cyclePath = this.findCyclePath(node, this);

            if (cyclePath !== null) {
                if (this.isValidCycle(cyclePath)) {
                    this.next.push(node);
                    node.previous.push(this);

                    cyclePath.forEach((n) => {
                        n.isCycle = true;
                        n.cycleRef = cyclePath;
                    });

                    return cyclePath;
                }
            }
        }

        this.next.push(node);
        node.previous.push(this);

        if (this.cycleRef !== null) {
            if (!this.isValidCycle(this.cycleRef)) {
                this.dismantleCycle(this.cycleRef);
            }
        }

        return null;
    }

    private isValidCycle(cyclePath: RawNode[]): boolean {
        const cycleSet = new Set<RawNode>(cyclePath);

        for (let i = 0; i < cyclePath.length; i++) {
            const cycleNode = cyclePath[i];

            for (let j = 0; j < cycleNode.next.length; j++) {
                const neighbor = cycleNode.next[j];

                if (!cycleSet.has(neighbor)) {
                    if (
                        neighbor.arrow.type !== ArrowType.EMPTY &&
                        neighbor.arrow.type !== ArrowType.LOGIC_AND
                    ) {
                        return false;
                    }

                    for (let k = 0; k < neighbor.next.length; k++) {
                        if (cycleSet.has(neighbor.next[k])) {
                            return false;
                        }
                    }
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
        const visited = new Set<RawNode>();
        const parentMap = new Map<RawNode, RawNode>();

        if (startNode === targetNode) {
            for (let i = 0; i < startNode.next.length; i++) {
                const child = startNode.next[i];
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

        while (queue.length > 0) {
            const current = queue.shift()!;

            for (let i = 0; i < current.next.length; i++) {
                const child = current.next[i];

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

                if (!canBeInCycle(child)) {
                    continue;
                }

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
            const visited = new Set<RawNode>([startNode]);
            startNode.isCycle = false;

            while (queue.length > 0) {
                const current = queue.shift()!;
                const neighbors = [...current.next, ...current.previous];

                for (let i = 0; i < neighbors.length; i++) {
                    const neighbor = neighbors[i];
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
