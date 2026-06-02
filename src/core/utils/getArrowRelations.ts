import { ArrowType } from './ArrowType';

export function getArrowRelations(type: ArrowType): Array<[number, number]> {
    switch (type) {
        case ArrowType.ARROW:
        case ArrowType.BLOCKER:
        case ArrowType.DELAY:
        case ArrowType.DETECTOR:
        case ArrowType.LOGIC_NOT:
        case ArrowType.LOGIC_AND:
        case ArrowType.LOGIC_XOR:
        case ArrowType.LATCH:
        case ArrowType.FLIP_FLOP:
        case ArrowType.RANDOM:
        case ArrowType.LEVEL_SOURCE:
        case ArrowType.DIRECTIONAL_BUTTON:
            return [[-1, 0]];
        case ArrowType.SOURCE:
        case ArrowType.IMPULSE:
        case ArrowType.BUTTON:
            return [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
            ];
        case ArrowType.SPLITTER_UP_DOWN:
            return [
                [-1, 0],
                [1, 0],
            ];
        case ArrowType.SPLITTER_UP_RIGHT:
            return [
                [-1, 0],
                [0, 1],
            ];
        case ArrowType.SPLITTER_UP_RIGHT_LEFT:
            return [
                [0, -1],
                [-1, 0],
                [0, 1],
            ];
        case ArrowType.BLUE_ARROW:
            return [[-2, 0]];
        case ArrowType.DIAGONAL_ARROW:
            return [[-1, 1]];
        case ArrowType.SPLITTER_UP_UP:
            return [
                [-1, 0],
                [-2, 0],
            ];
        case ArrowType.SPLITTER_RIGHT_UP:
            return [
                [0, 1],
                [-2, 0],
            ];
        case ArrowType.SPLITTER_UP_DIAGONAL:
            return [
                [-1, 0],
                [-1, 1],
            ];
        case ArrowType.EMPTY:
        case ArrowType.LEVEL_TARGET:
        default:
            return [];
    }
}
