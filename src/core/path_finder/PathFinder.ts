import type { GameMap } from '@logic-arrows/game-logic/game-map';
import { ArrowType } from '../utils/ArrowType';
import { getRelativePosition } from '../utils/getRelativePosition';
import { type BiSearchNode, SearchGridManager } from './BiSearchNode';
import { MinHeap } from './MinHeap';
import {
    ARROW_CONFIGS,
    ARROW_TYPES_LIST,
    Direction,
    HEURISTIC_TIEBREAKER,
    NodeStatus,
    PATHFINDING_TIMEOUT_MS,
    type PathStep,
} from './types';

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

        const getHeuristic = (
            x1: number,
            y1: number,
            x2: number,
            y2: number,
        ): number =>
            (Math.abs(x1 - x2) + Math.abs(y1 - y2)) * HEURISTIC_TIEBREAKER;

        heapForward.push(startPacked, getHeuristic(startX, startY, endX, endY));
        heapBackward.push(endPacked, getHeuristic(endX, endY, startX, startY));

        const startTime = performance.now();
        let loopCounter = 0;

        let bestPathCost = Infinity;
        let bestIntersectionPacked = -1;

        while (heapForward.size > 0 && heapBackward.size > 0) {
            loopCounter += 1;
            if (
                (loopCounter & 63) === 0 &&
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
        if (currentPacked === undefined) {
            return;
        }
        const currNode = this.grid.getNode(currentPacked);

        if (currNode.status[dir] === NodeStatus.CLOSED) {
            return;
        }
        currNode.status[dir] = NodeStatus.CLOSED;

        const { x: currentX, y: currentY } = this.grid.unpack(currentPacked);

        for (const arrowType of ARROW_TYPES_LIST) {
            const config = ARROW_CONFIGS[arrowType];

            for (let rotation = 0; rotation < 4; rotation += 1) {
                for (const flipped of [false, true]) {
                    if (arrowType !== ArrowType.DIAGONAL_ARROW && flipped) {
                        continue;
                    }

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
                    if (
                        arrow &&
                        arrow.astIndex !== undefined &&
                        arrow.astIndex !== null
                    ) {
                        const node = gameMap.rawGraph.getNode(arrow.astIndex);
                        if (node.previous.length !== 0) {
                            continue;
                        }
                    }

                    if (arrow && arrow.type !== 0) {
                        continue;
                    }

                    const targetPacked = this.grid.pack(nextX, nextY);
                    const targetNode = this.grid.getNode(targetPacked);

                    if (targetNode.status[dir] === NodeStatus.CLOSED) {
                        continue;
                    }

                    const oppDir =
                        dir === Direction.FORWARD
                            ? Direction.BACKWARD
                            : Direction.FORWARD;

                    let stepWeight = config.weight;
                    const parentPacked = currNode.parent[dir];

                    if (parentPacked !== -1) {
                        const prevNode = this.grid.getNode(parentPacked);
                        if (prevNode.arrowRotation[dir] !== rotation) {
                            stepWeight += 0.05;
                        }
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
    ): void {
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

        for (let i = 0; i < forwardChain.length - 1; i += 1) {
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
