import { CHUNK_AREA } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import { ArrowType } from '../utils/ArrowType';
import { getRelativePosition } from '../utils/getRelativePosition';

export interface PathStep {
    x: number;
    y: number;
    type: ArrowType;
    rotation: number;
    flipped: boolean;
}

interface ArrowConfig {
    forward: number;
    sideways: number;
    weight: number;
}

type ALLOWED_ARROW =
    | ArrowType.ARROW
    | ArrowType.BLUE_ARROW
    | ArrowType.DIAGONAL_ARROW;

const ARROW_CONFIGS: Record<ALLOWED_ARROW, ArrowConfig> = {
    [ArrowType.ARROW]: { forward: -1, sideways: 0, weight: 1.0 },
    [ArrowType.BLUE_ARROW]: { forward: -2, sideways: 0, weight: 2.0 },
    [ArrowType.DIAGONAL_ARROW]: { forward: -1, sideways: 1, weight: 1.5 },
};

const ARROW_TYPES_LIST: ALLOWED_ARROW[] = [
    ArrowType.ARROW,
    ArrowType.BLUE_ARROW,
    ArrowType.DIAGONAL_ARROW,
];

const PATHFINDING_TIMEOUT_MS = 200;
const HEURISTIC_TIEBREAKER = 1.0001;

const enum Direction {
    FORWARD = 0,
    BACKWARD = 1,
}

const enum NodeStatus {
    UNVISITED = 0,
    OPEN = 1,
    CLOSED = 2,
}

class BiSearchNode {
    gScore = [Infinity, Infinity];
    status = [NodeStatus.UNVISITED, NodeStatus.UNVISITED];
    parent = [-1, -1];
    arrowType = [ArrowType.ARROW, ArrowType.ARROW];
    arrowRotation = [0, 0];
    arrowFlipped = [false, false];
}

class BiSearchChunk {
    nodes: BiSearchNode[] = Array.from(
        { length: CHUNK_AREA },
        () => new BiSearchNode(),
    );
}

class SearchGridManager {
    private chunks = new Map<number, BiSearchChunk>();

    public clear(): void {
        this.chunks.clear();
    }

    public pack(x: number, y: number): number {
        return (x << 16) | (y & 0xffff);
    }

    public unpack(packed: number) {
        return {
            x: packed >> 16,
            y: (packed << 16) >> 16,
        };
    }

    public getNode(packed: number): BiSearchNode {
        const x = packed >> 16;
        const y = (packed << 16) >> 16;

        const cx = x >> 4;
        const cy = y >> 4;
        const chunkKey = (cx << 16) | (cy & 0xffff);

        let chunk = this.chunks.get(chunkKey);
        if (!chunk) {
            chunk = new BiSearchChunk();
            this.chunks.set(chunkKey, chunk);
        }

        const cellIdx = (x & 15) | ((y & 15) << 4);
        return chunk.nodes[cellIdx];
    }
}

class MinHeap {
    private data: number[] = [];
    private scores: number[] = [];

    public get size(): number {
        return this.data.length;
    }

    public get minScore(): number {
        return this.scores.length > 0 ? this.scores[0] : Infinity;
    }

    public push(element: number, score: number): void {
        this.data.push(element);
        this.scores.push(score);
        this.up(this.data.length - 1);
    }

    public pop(): number | undefined {
        if (this.data.length === 0) return undefined;
        const result = this.data[0];
        const endElement = this.data.pop()!;
        const endScore = this.scores.pop()!;

        if (this.data.length > 0) {
            this.data[0] = endElement;
            this.scores[0] = endScore;
            this.down(0);
        }
        return result;
    }

    private up(n: number): void {
        const element = this.data[n];
        const score = this.scores[n];
        while (n > 0) {
            const parentN = (n - 1) >> 1;
            const parentScore = this.scores[parentN];
            if (score >= parentScore) break;
            this.data[n] = this.data[parentN];
            this.scores[n] = parentScore;
            n = parentN;
        }
        this.data[n] = element;
        this.scores[n] = score;
    }

    private down(n: number): void {
        const length = this.data.length;
        const element = this.data[n];
        const score = this.scores[n];

        while (true) {
            const child1N = (n << 1) + 1;
            const child2N = child1N + 1;
            let swap = -1;
            let minScore = score;

            if (child1N < length && this.scores[child1N] < minScore) {
                swap = child1N;
                minScore = this.scores[child1N];
            }
            if (child2N < length && this.scores[child2N] < minScore) {
                swap = child2N;
            }

            if (swap === -1) break;

            this.data[n] = this.data[swap];
            this.scores[n] = this.scores[swap];
            n = swap;
        }
        this.data[n] = element;
        this.scores[n] = score;
    }
}

export class PathFinder {
    private grid = new SearchGridManager();

    public findPath(
        gameMap: GameMap,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
    ): PathStep[] | null {
        this.grid.clear();

        const startPacked = this.grid.pack(startX, startY);
        const endPacked = this.grid.pack(endX, endY);

        const startNode = this.grid.getNode(startPacked);
        startNode.gScore[Direction.FORWARD] = 0;
        startNode.status[Direction.FORWARD] = NodeStatus.OPEN;

        const endNode = this.grid.getNode(endPacked);
        endNode.gScore[Direction.BACKWARD] = 0;
        endNode.status[Direction.BACKWARD] = NodeStatus.OPEN;

        const heapForward = new MinHeap();
        const heapBackward = new MinHeap();

        const getHeuristic = (x1: number, y1: number, x2: number, y2: number) =>
            (Math.abs(x1 - x2) + Math.abs(y1 - y2)) * HEURISTIC_TIEBREAKER;

        heapForward.push(startPacked, getHeuristic(startX, startY, endX, endY));
        heapBackward.push(endPacked, getHeuristic(endX, endY, startX, startY));

        const startTime = performance.now();
        let loopCounter = 0;

        let bestPathCost = Infinity;
        let bestIntersectionPacked = -1;

        while (heapForward.size > 0 && heapBackward.size > 0) {
            if (
                (++loopCounter & 63) === 0 &&
                performance.now() - startTime > PATHFINDING_TIMEOUT_MS
            ) {
                break;
            }

            if (
                heapForward.minScore >= bestPathCost &&
                heapBackward.minScore >= bestPathCost
            ) {
                break;
            }

            this.expandFront(
                gameMap,
                heapForward,
                Direction.FORWARD,
                endX,
                endY,
                (cost, packed) => {
                    if (cost < bestPathCost) {
                        bestPathCost = cost;
                        bestIntersectionPacked = packed;
                    }
                },
            );

            this.expandFront(
                gameMap,
                heapBackward,
                Direction.BACKWARD,
                startX,
                startY,
                (cost, packed) => {
                    if (cost < bestPathCost) {
                        bestPathCost = cost;
                        bestIntersectionPacked = packed;
                    }
                },
            );
        }

        if (bestIntersectionPacked !== -1) {
            return this.reconstructPath(bestIntersectionPacked);
        }

        return null;
    }

    private expandFront(
        gameMap: GameMap,
        heap: MinHeap,
        dir: Direction,
        targetX: number,
        targetY: number,
        onIntersection: (cost: number, packed: number) => void,
    ): void {
        const currentPacked = heap.pop();
        if (currentPacked === undefined) return;
        const currNode = this.grid.getNode(currentPacked);

        if (currNode.status[dir] === NodeStatus.CLOSED) return;
        currNode.status[dir] = NodeStatus.CLOSED;

        const { x: currentX, y: currentY } = this.grid.unpack(currentPacked);

        for (const arrowType of ARROW_TYPES_LIST) {
            const config = ARROW_CONFIGS[arrowType];

            for (let rotation = 0; rotation < 4; rotation++) {
                for (const flipped of [false, true]) {
                    if (arrowType !== ArrowType.DIAGONAL_ARROW && flipped)
                        continue;

                    const modifier = dir === Direction.FORWARD ? 1 : -1;
                    const { x: nextX, y: nextY } = getRelativePosition(
                        currentX,
                        currentY,
                        rotation,
                        flipped,
                        config.forward * modifier,
                        config.sideways * modifier,
                    );

                    const arrow = gameMap.getArrow(nextX, nextY);
                    if (arrow?.graphAstIndex) {
                        const node = gameMap.rawGraph.getNode(
                            arrow.graphAstIndex,
                        );
                        if (node.previous.length !== 0) continue;
                    }

                    if (arrow && arrow.type !== 0) continue;

                    const targetPacked = this.grid.pack(nextX, nextY);
                    const targetNode = this.grid.getNode(targetPacked);

                    if (targetNode.status[dir] === NodeStatus.CLOSED) continue;

                    const oppDir =
                        dir === Direction.FORWARD
                            ? Direction.BACKWARD
                            : Direction.FORWARD;

                    let stepWeight = config.weight;
                    const parentPacked = currNode.parent[dir];

                    if (parentPacked !== -1) {
                        const prevNode = this.grid.getNode(parentPacked);
                        if (prevNode.arrowRotation[dir] !== rotation)
                            stepWeight += 0.05;
                    }

                    const tentativeG = currNode.gScore[dir] + stepWeight;

                    if (tentativeG < targetNode.gScore[dir]) {
                        this.recordStep(
                            targetNode,
                            currentPacked,
                            arrowType,
                            rotation,
                            flipped,
                            dir,
                        );
                        targetNode.gScore[dir] = tentativeG;
                        targetNode.status[dir] = NodeStatus.OPEN;

                        const fScore =
                            tentativeG +
                            (Math.abs(nextX - targetX) +
                                Math.abs(nextY - targetY)) *
                                HEURISTIC_TIEBREAKER;
                        heap.push(targetPacked, fScore);

                        if (
                            targetNode.status[oppDir] !== NodeStatus.UNVISITED
                        ) {
                            const cost = tentativeG + targetNode.gScore[oppDir];
                            onIntersection(cost, targetPacked);
                        }
                    }
                }
            }
        }
    }

    private recordStep(
        node: BiSearchNode,
        parentPacked: number,
        type: ArrowType,
        rotation: number,
        flipped: boolean,
        dir: Direction,
    ) {
        node.parent[dir] = parentPacked;
        node.arrowType[dir] = type;
        node.arrowRotation[dir] = rotation;
        node.arrowFlipped[dir] = flipped;
    }

    private reconstructPath(intersectionPacked: number): PathStep[] {
        const path: PathStep[] = [];
        const forwardChain: number[] = [];

        let current = intersectionPacked;
        while (current !== -1) {
            forwardChain.push(current);
            current = this.grid.getNode(current).parent[Direction.FORWARD];
        }
        forwardChain.reverse();

        for (let i = 0; i < forwardChain.length - 1; i++) {
            const packedPos = forwardChain[i];
            const targetNode = this.grid.getNode(forwardChain[i + 1]);
            const pos = this.grid.unpack(packedPos);

            path.push({
                x: pos.x,
                y: pos.y,
                type: targetNode.arrowType[Direction.FORWARD],
                rotation: targetNode.arrowRotation[Direction.FORWARD],
                flipped: targetNode.arrowFlipped[Direction.FORWARD],
            });
        }

        current = intersectionPacked;
        while (current !== -1) {
            const node = this.grid.getNode(current);
            if (node.parent[Direction.BACKWARD] !== -1) {
                const pos = this.grid.unpack(current);
                path.push({
                    x: pos.x,
                    y: pos.y,
                    type: node.arrowType[Direction.BACKWARD],
                    rotation: node.arrowRotation[Direction.BACKWARD],
                    flipped: node.arrowFlipped[Direction.BACKWARD],
                });
            }
            current = node.parent[Direction.BACKWARD];
        }

        return path;
    }
}
