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

export function IsArrowEntryPoint(type: ArrowType): boolean {
    return (
        type === ArrowType.SOURCE ||
        type === ArrowType.IMPULSE ||
        type === ArrowType.LOGIC_NOT
    );
}
