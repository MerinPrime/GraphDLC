import { ArrowType } from './ArrowType';

type RelationCoords = Array<[forward: number, sideways: number]>;

const ARROW_RELATIONS_MAP: Record<ArrowType, RelationCoords> = {
    [ArrowType.ARROW]: [[-1, 0]],
    [ArrowType.BLOCKER]: [[-1, 0]],
    [ArrowType.DELAY]: [[-1, 0]],
    [ArrowType.DETECTOR]: [[-1, 0]],
    [ArrowType.LOGIC_NOT]: [[-1, 0]],
    [ArrowType.LOGIC_AND]: [[-1, 0]],
    [ArrowType.LOGIC_XOR]: [[-1, 0]],
    [ArrowType.LATCH]: [[-1, 0]],
    [ArrowType.FLIP_FLOP]: [[-1, 0]],
    [ArrowType.RANDOM]: [[-1, 0]],
    [ArrowType.LEVEL_SOURCE]: [[-1, 0]],
    [ArrowType.DIRECTIONAL_BUTTON]: [[-1, 0]],

    [ArrowType.SOURCE]: [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ],
    [ArrowType.IMPULSE]: [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ],
    [ArrowType.BUTTON]: [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ],

    [ArrowType.SPLITTER_UP_DOWN]: [
        [-1, 0],
        [1, 0],
    ],
    [ArrowType.SPLITTER_UP_RIGHT]: [
        [-1, 0],
        [0, 1],
    ],
    [ArrowType.SPLITTER_UP_RIGHT_LEFT]: [
        [0, -1],
        [-1, 0],
        [0, 1],
    ],
    [ArrowType.BLUE_ARROW]: [[-2, 0]],
    [ArrowType.DIAGONAL_ARROW]: [[-1, 1]],
    [ArrowType.SPLITTER_UP_UP]: [
        [-1, 0],
        [-2, 0],
    ],
    [ArrowType.SPLITTER_RIGHT_UP]: [
        [0, 1],
        [-2, 0],
    ],
    [ArrowType.SPLITTER_UP_DIAGONAL]: [
        [-1, 0],
        [-1, 1],
    ],

    [ArrowType.EMPTY]: [],
    [ArrowType.WALL]: [],
    [ArrowType.LEVEL_TARGET]: [],
};

export function getArrowRelations(type: ArrowType): RelationCoords {
    return ARROW_RELATIONS_MAP[type] ?? [];
}
