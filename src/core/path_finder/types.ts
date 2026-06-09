import { ArrowType } from '../utils/ArrowType';

export interface PathStep {
    x: number;
    y: number;
    type: ArrowType;
    rotation: number;
    flipped: boolean;
}

export interface ArrowConfig {
    forward: number;
    sideways: number;
    weight: number;
}

export type AllowedArrow =
    | ArrowType.ARROW
    | ArrowType.BLUE_ARROW
    | ArrowType.DIAGONAL_ARROW;

export const ARROW_CONFIGS: Record<AllowedArrow, ArrowConfig> = {
    [ArrowType.ARROW]: { forward: -1, sideways: 0, weight: 1.0 },
    [ArrowType.BLUE_ARROW]: { forward: -2, sideways: 0, weight: 2.0 },
    [ArrowType.DIAGONAL_ARROW]: { forward: -1, sideways: 1, weight: 1.5 },
};

export const ARROW_TYPES_LIST: AllowedArrow[] = [
    ArrowType.ARROW,
    ArrowType.BLUE_ARROW,
    ArrowType.DIAGONAL_ARROW,
];

export const PATHFINDING_TIMEOUT_MS = 200;
export const HEURISTIC_TIEBREAKER = 1.0001;

export const enum Direction {
    FORWARD = 0,
    BACKWARD = 1,
}

export const enum NodeStatus {
    UNVISITED = 0,
    OPEN = 1,
    CLOSED = 2,
}
