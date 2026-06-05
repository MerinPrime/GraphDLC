export enum ArrowType {
    EMPTY = 0,
    ARROW = 1,
    SOURCE = 2,
    BLOCKER = 3,
    DELAY = 4,
    DETECTOR = 5,
    SPLITTER_UP_DOWN = 6,
    SPLITTER_UP_RIGHT = 7,
    SPLITTER_UP_RIGHT_LEFT = 8,
    IMPULSE = 9,
    BLUE_ARROW = 10,
    DIAGONAL_ARROW = 11,
    SPLITTER_UP_UP = 12,
    SPLITTER_RIGHT_UP = 13,
    SPLITTER_UP_DIAGONAL = 14,
    LOGIC_NOT = 15,
    LOGIC_AND = 16,
    LOGIC_XOR = 17,
    LATCH = 18,
    FLIP_FLOP = 19,
    RANDOM = 20,
    BUTTON = 21,
    LEVEL_SOURCE = 22,
    LEVEL_TARGET = 23,
    DIRECTIONAL_BUTTON = 24,
    WALL = 25,
}

export const ArrowTypeCount = 24;

export function IsAdditionalUpdate(type: ArrowType): boolean {
    return (
        type === ArrowType.DELAY ||
        type === ArrowType.IMPULSE ||
        type === ArrowType.FLIP_FLOP ||
        type === ArrowType.RANDOM
    );
}

export function IsArrowPath(type: ArrowType): boolean {
    return (
        type === ArrowType.ARROW ||
        type === ArrowType.SPLITTER_UP_DOWN ||
        type === ArrowType.SPLITTER_UP_RIGHT ||
        type === ArrowType.SPLITTER_UP_RIGHT_LEFT ||
        type === ArrowType.BLUE_ARROW ||
        type === ArrowType.DIAGONAL_ARROW ||
        type === ArrowType.SPLITTER_UP_UP ||
        type === ArrowType.SPLITTER_RIGHT_UP ||
        type === ArrowType.SPLITTER_UP_DIAGONAL
    );
}

export function IsArrowEntryPoint(type: ArrowType): boolean {
    return (
        type === ArrowType.SOURCE ||
        type === ArrowType.IMPULSE ||
        type === ArrowType.LOGIC_NOT ||
        type === ArrowType.BUTTON ||
        type === ArrowType.DIRECTIONAL_BUTTON
    );
}
