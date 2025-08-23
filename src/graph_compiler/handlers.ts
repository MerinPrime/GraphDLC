import {Arrow} from "../api/arrow";
import {Chunk} from "../api/chunk";
import {ArrowType} from "../api/arrow_type";
import {GraphNode} from "./graph_node";
import {CycleHeadType} from "./ast/cycle/cycleHeadType";

export type GetEdgesFunc = (arrow: Arrow, x: number, y: number, chunk: Chunk) => ([Arrow, number, number, Chunk] | undefined)[];
export type UpdateFunc = (arrow: Arrow, currentTick: number) => boolean | void;

const CHUNK_SIZE = 16;

export function getRelativeArrow(
    chunk: Chunk, x: number, y: number, rotation: number,
    flipped: boolean, forward: number = -1, sideways: number = 0
): [Arrow, number, number, Chunk] | undefined {
    if (flipped) {
        sideways = -sideways;
    }

    let targetX = x;
    let targetY = y;

    switch (rotation) {
        case 0: targetY += forward; targetX += sideways; break;
        case 1: targetX -= forward; targetY += sideways; break;
        case 2: targetY -= forward; targetX -= sideways; break;
        case 3: targetX += forward; targetY -= sideways; break;
    }

    let targetChunk = chunk;
    const dx = Math.floor(targetX / CHUNK_SIZE);
    const dy = Math.floor(targetY / CHUNK_SIZE);

    if (dx !== 0 || dy !== 0) {
        const chunkIndex = (dy + 1) * 3 + (dx + 1);
        const adjacentMap = [7, 0, 1, 6, -1, 2, 5, 4, 3];
        const adjacentIndex = adjacentMap[chunkIndex];

        if (adjacentIndex === -1 || !chunk.adjacentChunks[adjacentIndex]) {
            return undefined;
        }
        targetChunk = chunk.adjacentChunks[adjacentIndex]!;
        targetX %= CHUNK_SIZE;
        targetY %= CHUNK_SIZE;
        if (targetX < 0) targetX += CHUNK_SIZE;
        if (targetY < 0) targetY += CHUNK_SIZE;
    }

    if (!targetChunk) return undefined;

    return [targetChunk.getArrow(targetX, targetY), targetX, targetY, targetChunk];
}

export const ACTIVE_SIGNALS: Array<number> = new Array<number>(25);
ACTIVE_SIGNALS[ArrowType.EMPTY] = -1
ACTIVE_SIGNALS[ArrowType.ARROW] = 1
ACTIVE_SIGNALS[ArrowType.SOURCE] = 1
ACTIVE_SIGNALS[ArrowType.BLOCKER] = 1
ACTIVE_SIGNALS[ArrowType.DELAY] = 1
ACTIVE_SIGNALS[ArrowType.DETECTOR] = 1
ACTIVE_SIGNALS[ArrowType.SPLITTER_UP_DOWN] = 1
ACTIVE_SIGNALS[ArrowType.SPLITTER_UP_RIGHT] = 1
ACTIVE_SIGNALS[ArrowType.SPLITTER_UP_RIGHT_LEFT] = 1
ACTIVE_SIGNALS[ArrowType.IMPULSE] = 1
ACTIVE_SIGNALS[ArrowType.BLUE_ARROW] = 2
ACTIVE_SIGNALS[ArrowType.DIAGONAL_ARROW] = 2
ACTIVE_SIGNALS[ArrowType.SPLITTER_UP_UP] = 2
ACTIVE_SIGNALS[ArrowType.SPLITTER_RIGHT_UP] = 2
ACTIVE_SIGNALS[ArrowType.SPLITTER_UP_DIAGONAL] = 2
ACTIVE_SIGNALS[ArrowType.LOGIC_NOT] = 3
ACTIVE_SIGNALS[ArrowType.LOGIC_AND] = 3
ACTIVE_SIGNALS[ArrowType.LOGIC_XOR] = 3
ACTIVE_SIGNALS[ArrowType.LATCH] = 3
ACTIVE_SIGNALS[ArrowType.FLIP_FLOP] = 3
ACTIVE_SIGNALS[ArrowType.RANDOM] = 5
ACTIVE_SIGNALS[ArrowType.BUTTON] = 5
ACTIVE_SIGNALS[ArrowType.LEVEL_SOURCE] = -1
ACTIVE_SIGNALS[ArrowType.LEVEL_TARGET] = -1
ACTIVE_SIGNALS[ArrowType.DIRECTIONAL_BUTTON] = 5

export const EXIST_TYPES = new Set([
    ArrowType.ARROW,
    ArrowType.SOURCE,
    ArrowType.BLOCKER,
    ArrowType.DELAY,
    ArrowType.DETECTOR,
    ArrowType.SPLITTER_UP_DOWN,
    ArrowType.SPLITTER_UP_RIGHT,
    ArrowType.SPLITTER_UP_RIGHT_LEFT,
    ArrowType.IMPULSE,
    ArrowType.BLUE_ARROW,
    ArrowType.DIAGONAL_ARROW,
    ArrowType.SPLITTER_UP_UP,
    ArrowType.SPLITTER_RIGHT_UP,
    ArrowType.SPLITTER_UP_DIAGONAL,
    ArrowType.LOGIC_NOT,
    ArrowType.LOGIC_AND,
    ArrowType.LOGIC_XOR,
    ArrowType.LATCH,
    ArrowType.FLIP_FLOP,
    ArrowType.RANDOM,
    ArrowType.BUTTON,
    ArrowType.DIRECTIONAL_BUTTON,
]);

export const ENTRY_POINTS = new Set([
    ArrowType.SOURCE,
    ArrowType.IMPULSE,
    ArrowType.LOGIC_NOT,
    ArrowType.BUTTON,
    ArrowType.DIRECTIONAL_BUTTON,
]);

export const NOT_ALLOWED_TO_CHANGE = new Set([
    ArrowType.SOURCE,
    ArrowType.DETECTOR,
    ArrowType.IMPULSE,
    ArrowType.BUTTON,
]);

export const ADDITIONAL_UPDATE_ARROWS = new Set([
    ArrowType.DELAY,
    ArrowType.DETECTOR,
    ArrowType.IMPULSE,
    ArrowType.LOGIC_NOT,
    ArrowType.FLIP_FLOP,
    ArrowType.LATCH,
    ArrowType.BUTTON,
    ArrowType.DIRECTIONAL_BUTTON,
]);

export const NOT_ALLOWED_IN_CYCLE = new Set([
    ArrowType.BLOCKER,
    // ArrowType.DELAY, // Not needed because timers can contain delay arrow
    ArrowType.LOGIC_NOT,
    ArrowType.LOGIC_AND,
    ArrowType.LATCH,
    ArrowType.FLIP_FLOP,
    ArrowType.RANDOM,
    ArrowType.DIRECTIONAL_BUTTON,
]);

export class ArrowHandler {
    active_signal: number;
    get_edges: GetEdgesFunc;
    update: UpdateFunc;
    
    constructor(active_signal: number, get_edges: GetEdgesFunc, update: UpdateFunc) {
        this.active_signal = active_signal;
        this.get_edges = get_edges;
        this.update = update;
    }
}

export const ALLOWED_IN_BUTTON = new Set([
    ArrowType.IMPULSE,
    ArrowType.DIRECTIONAL_BUTTON,
    ArrowType.ARROW,
    ArrowType.DETECTOR,
    ArrowType.BLUE_ARROW,
    ArrowType.DIAGONAL_ARROW,
]);

export const ALLOWED_IN_PIXEL = new Set([
    ArrowType.ARROW,
    ArrowType.DELAY,
    ArrowType.DETECTOR,
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

export const ALLOWED_IN_PATH = new Set([
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

export const ALLOWED_IN_PRETIMER = new Set([
    ArrowType.ARROW,
    ArrowType.DELAY,
    ArrowType.DETECTOR,
    ArrowType.SPLITTER_UP_DOWN,
    ArrowType.SPLITTER_UP_RIGHT,
    ArrowType.SPLITTER_UP_RIGHT_LEFT,
    ArrowType.BLUE_ARROW,
    ArrowType.DIAGONAL_ARROW,
    ArrowType.SPLITTER_UP_UP,
    ArrowType.SPLITTER_RIGHT_UP,
    ArrowType.SPLITTER_UP_DIAGONAL,
    ArrowType.LOGIC_XOR,
    ArrowType.IMPULSE,
]);

export const ALLOWED_IN_TIMER = new Set([
    ArrowType.ARROW,
    ArrowType.DELAY,
    ArrowType.DETECTOR,
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

export const IS_BRANCH = new Set([
    ArrowType.SPLITTER_UP_DOWN,
    ArrowType.SPLITTER_UP_RIGHT,
    ArrowType.SPLITTER_UP_RIGHT_LEFT,
    ArrowType.SPLITTER_UP_UP,
    ArrowType.SPLITTER_RIGHT_UP,
    ArrowType.SPLITTER_UP_DIAGONAL,
]);

export const ALLOWED_IN_BRANCH = new Set([
    ArrowType.ARROW,
    ArrowType.DETECTOR,
    ArrowType.SPLITTER_UP_DOWN,
    ArrowType.SPLITTER_UP_RIGHT,
    ArrowType.SPLITTER_UP_RIGHT_LEFT,
    ArrowType.SPLITTER_UP_UP,
    ArrowType.SPLITTER_RIGHT_UP,
    ArrowType.SPLITTER_UP_DIAGONAL,
]);

export const EMPTY_HANDLER = new ArrowHandler(
    -1,
    (arrow: any, x: number, y: number, chunk: any) => [],
    (arrow: any) => {},
);

export const RED_ARROW_HANDLER = new ArrowHandler(
    1,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 0);
    },
);

export const RED_SOURCE_HANDLER = new ArrowHandler(
    1,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, 1),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 1, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, -1),
    ],
    (arrow: any) => {
        arrow.signal = 1;
    },
);

export const DELAY_ARROW_HANDLER = new ArrowHandler(
    1,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
    ],
    (arrow: any) => {
        if (arrow.signal === 2) {
            arrow.signal = 1;
        } else if (arrow.signalsCount > 0) {
            if (arrow.signal === 0) {
                arrow.signal = 2;
            } else if (arrow.signal === 1) {
                arrow.signal = 1;
            }
        } else {
            arrow.signal = 0;
        }
    },
);

export const SPLITTER_1_HANDLER = new ArrowHandler(
    1,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 1, 0),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 0);
    },
);

export const SPLITTER_2_HANDLER = new ArrowHandler(
    1,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, 1),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 0);
    },
);

export const SPLITTER_3_HANDLER = new ArrowHandler(
    1,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, -1),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, 1),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 0);
    },
);

export const IMPULSE_HANDLER = new ArrowHandler(
    1,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, 1),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 1, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, -1),
    ],
    (arrow: any) => {
        if (arrow.signal === 0) {
            arrow.signal = 1;
        } else {
            arrow.signal = 2;
        }
    },
);

export const BLUE_ARROW_HANDLER = new ArrowHandler(
    2,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -2, 0),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 0) * 2;
    },
);

export const BLUE_DIAGONAL_ARROW_HANDLER = new ArrowHandler(
    2,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 1),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 0) * 2;
    },
);

export const BLUE_SPLITTER_1_HANDLER = new ArrowHandler(
    2,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -2, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 0) * 2;
    },
);

export const BLUE_SPLITTER_2_HANDLER = new ArrowHandler(
    2,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -2, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, 1),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 0) * 2;
    },
);

export const BLUE_SPLITTER_3_HANDLER = new ArrowHandler(
    2,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 1),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 0) * 2;
    },
);

export const LOGIC_NOT_HANDLER = new ArrowHandler(
    3,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount == 0) * 3;
    },
);

export const LOGIC_AND_HANDLER = new ArrowHandler(
    3,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 1) * 3;
    },
);

export const LOGIC_XOR_HANDLER = new ArrowHandler(
    3,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount % 2 === 1) * 3;
    },
);

export const LOGIC_FLIP_HANDLER = new ArrowHandler(
    3,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
    ],
    (arrow: any) => {
        if (arrow.signalsCount > 1)
            arrow.signal = 3;
        else if (arrow.signalsCount === 1)
            arrow.signal = 0
    },
);

export const LOGIC_FLOP_HANDLER = new ArrowHandler(
    3,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
    ],
    (arrow: any) => {
        if (arrow.signalsCount > 0) {
            if (arrow.signal === 3) {
                arrow.signal = 0;
            } else {
                arrow.signal = 3;
            }
        }
    },
);

export const RANDOM_HANDLER = new ArrowHandler(
    5,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 0 && Math.random() > 0.5) * 5;
    },
);

export const BUTTON_HANDLER = new ArrowHandler(
    5,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, 1),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 1, 0),
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, -1),
    ],
    (arrow: any) => {
        arrow.signal = 0;
    },
);

export const BRUH_BUTTON_HANDLER = new ArrowHandler(
    5,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.signalsCount > 0) * 5;
    },
);

export const HANDLERS = new Map<ArrowType, ArrowHandler>([
    [ArrowType.EMPTY, EMPTY_HANDLER],
    [ArrowType.ARROW, RED_ARROW_HANDLER],
    [ArrowType.SOURCE, RED_SOURCE_HANDLER],
    [ArrowType.BLOCKER, RED_ARROW_HANDLER],
    [ArrowType.DELAY, DELAY_ARROW_HANDLER],
    [ArrowType.DETECTOR, RED_ARROW_HANDLER],
    [ArrowType.SPLITTER_UP_DOWN, SPLITTER_1_HANDLER],
    [ArrowType.SPLITTER_UP_RIGHT, SPLITTER_2_HANDLER],
    [ArrowType.SPLITTER_UP_RIGHT_LEFT, SPLITTER_3_HANDLER],
    [ArrowType.IMPULSE, IMPULSE_HANDLER],
    [ArrowType.BLUE_ARROW, BLUE_ARROW_HANDLER],
    [ArrowType.DIAGONAL_ARROW, BLUE_DIAGONAL_ARROW_HANDLER],
    [ArrowType.SPLITTER_UP_UP, BLUE_SPLITTER_1_HANDLER],
    [ArrowType.SPLITTER_RIGHT_UP, BLUE_SPLITTER_2_HANDLER],
    [ArrowType.SPLITTER_UP_DIAGONAL, BLUE_SPLITTER_3_HANDLER],
    [ArrowType.LOGIC_NOT, LOGIC_NOT_HANDLER],
    [ArrowType.LOGIC_AND, LOGIC_AND_HANDLER],
    [ArrowType.LOGIC_XOR, LOGIC_XOR_HANDLER],
    [ArrowType.LATCH, LOGIC_FLIP_HANDLER],
    [ArrowType.FLIP_FLOP, LOGIC_FLOP_HANDLER],
    [ArrowType.RANDOM, RANDOM_HANDLER],
    [ArrowType.BUTTON, BUTTON_HANDLER],
    [ArrowType.LEVEL_SOURCE, EMPTY_HANDLER],
    [ArrowType.LEVEL_TARGET, EMPTY_HANDLER],
    [ArrowType.DIRECTIONAL_BUTTON, BRUH_BUTTON_HANDLER],
]);

export function updateNode(graphNode: GraphNode, currentTick: number) {
    const arrow = graphNode.arrow;
    if (arrow.blocked! > 0) {
        arrow.signal = 0;
    } else {
        switch (graphNode.arrow.type) {
            case ArrowType.ARROW:
            case ArrowType.BLOCKER:
            case ArrowType.DETECTOR:
            case ArrowType.SPLITTER_UP_DOWN:
            case ArrowType.SPLITTER_UP_RIGHT:
            case ArrowType.SPLITTER_UP_RIGHT_LEFT:
                arrow.signal = arrow.signalsCount > 0 ? 1 : 0;
                break;
            case ArrowType.SOURCE:
                arrow.signal = 1;
                break;
            case ArrowType.DELAY:
                if (arrow.signal === 2) {
                    arrow.signal = 1;
                } else if (arrow.signalsCount > 0) {
                    if (arrow.signal === 0) {
                        arrow.signal = 2;
                    } else if (arrow.signal === 1) {
                        arrow.signal = 1;
                    }
                } else {
                    arrow.signal = 0;
                }
                break;
            case ArrowType.IMPULSE:
                if (arrow.signal === 0) {
                    arrow.signal = 1;
                } else {
                    arrow.signal = 2;
                }
                break;
            case ArrowType.BLUE_ARROW:
            case ArrowType.DIAGONAL_ARROW:
            case ArrowType.SPLITTER_UP_UP:
            case ArrowType.SPLITTER_RIGHT_UP:
            case ArrowType.SPLITTER_UP_DIAGONAL:
                arrow.signal = arrow.signalsCount > 0 ? 2 : 0;
                break;
            case ArrowType.LOGIC_NOT:
                arrow.signal = arrow.signalsCount === 0 ? 3 : 0;
                break;
            case ArrowType.LOGIC_AND:
                if (graphNode.cycleHeadType === CycleHeadType.READ) {
                    if (arrow.signalsCount > 1) {
                        arrow.signal = 3;
                    } else if (arrow.signalsCount === 0) {
                        arrow.signal = 0;
                    } else {
                        arrow.signal = graphNode.newCycle!.data.read(currentTick + graphNode.cycleOffset) ? 3 : 0;
                    }
                } else {
                    arrow.signal = arrow.signalsCount > 1 ? 3 : 0;
                }
                break;
            case ArrowType.LOGIC_XOR:
                arrow.signal = arrow.signalsCount % 2 === 1 ? 3 : 0;
                break;
            case ArrowType.LATCH:
                if (arrow.signalsCount > 1)
                    arrow.signal = 3;
                else if (arrow.signalsCount === 1)
                    arrow.signal = 0
                break;
            case ArrowType.FLIP_FLOP:
                if (arrow.signalsCount > 0) {
                    if (arrow.signal === 3) {
                        arrow.signal = 0;
                    } else {
                        arrow.signal = 3;
                    }
                }
                break;
            case ArrowType.RANDOM:
                arrow.signal = arrow.signalsCount > 0 && Math.random() > 0.5 ? 5 : 0;
                break;
            case ArrowType.DIRECTIONAL_BUTTON:
                arrow.signal = arrow.signalsCount > 0 ? 5 : 0;
                break;
            default:
                arrow.signal = 0;
                break;
        }
    }
}