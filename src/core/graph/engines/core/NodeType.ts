import { ArrowType } from 'src/core/utils/ArrowType';

export const enum NodeType {
    EMPTY = 0,
    PATH = 1,
    SOURCE = 2,
    BLOCKER = 3,
    DELAY = 4,
    DETECTOR = 5,
    IMPULSE = 6,
    LOGIC_NOT = 7,
    LOGIC_AND = 8,
    LOGIC_XOR = 9,
    LATCH = 10,
    FLIP_FLOP = 11,
    RANDOM = 12,
    BUTTON = 13,
    DIRECTIONAL_BUTTON = 14,
}

export namespace NodeTypes {
    export function fromArrowType(type: ArrowType) {
        switch (type) {
            case ArrowType.EMPTY:
                return NodeType.EMPTY;
            case ArrowType.ARROW:
            case ArrowType.SPLITTER_UP_DOWN:
            case ArrowType.SPLITTER_UP_RIGHT:
            case ArrowType.SPLITTER_UP_RIGHT_LEFT:
            case ArrowType.BLUE_ARROW:
            case ArrowType.DIAGONAL_ARROW:
            case ArrowType.SPLITTER_UP_UP:
            case ArrowType.SPLITTER_RIGHT_UP:
            case ArrowType.SPLITTER_UP_DIAGONAL:
            case ArrowType.LEVEL_SOURCE:
            case ArrowType.LEVEL_TARGET:
                return NodeType.PATH;
            case ArrowType.SOURCE:
                return NodeType.SOURCE;
            case ArrowType.BLOCKER:
                return NodeType.BLOCKER;
            case ArrowType.DELAY:
                return NodeType.DELAY;
            case ArrowType.DETECTOR:
                return NodeType.DETECTOR;
            case ArrowType.IMPULSE:
                return NodeType.IMPULSE;
            case ArrowType.LOGIC_NOT:
                return NodeType.LOGIC_NOT;
            case ArrowType.LOGIC_AND:
                return NodeType.LOGIC_AND;
            case ArrowType.LOGIC_XOR:
                return NodeType.LOGIC_XOR;
            case ArrowType.LATCH:
                return NodeType.LATCH;
            case ArrowType.FLIP_FLOP:
                return NodeType.FLIP_FLOP;
            case ArrowType.RANDOM:
                return NodeType.RANDOM;
            case ArrowType.BUTTON:
                return NodeType.BUTTON;
            case ArrowType.DIRECTIONAL_BUTTON:
                return NodeType.DIRECTIONAL_BUTTON;
            default:
                return NodeType.EMPTY;
        }
    }

    export function isEntryPoint(type: NodeType): boolean {
        return (
            type === NodeType.SOURCE ||
            type === NodeType.IMPULSE ||
            type === NodeType.LOGIC_NOT ||
            type === NodeType.BUTTON ||
            type === NodeType.DIRECTIONAL_BUTTON
        );
    }

    export function isAdditionalUpdate(type: NodeType): boolean {
        return (
            type === NodeType.DELAY ||
            type === NodeType.IMPULSE ||
            type === NodeType.FLIP_FLOP ||
            type === NodeType.RANDOM
        );
    }
}
