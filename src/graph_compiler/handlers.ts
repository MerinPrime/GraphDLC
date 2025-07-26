import {Arrow} from "../api/arrow";
import {Chunk} from "../api/chunk";
import {ArrowType} from "../api/arrow_type";

export type GetEdgesFunc = (arrow: Arrow, x: number, y: number, chunk: Chunk) => ([Arrow, number, number, Chunk] | undefined)[];
export type UpdateFunc = (arrow: Arrow) => boolean | void;

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

export const NOT_ALLOWED_TO_CHANGE = new Set([
    ArrowType.EMPTY, // EMPTY
    ArrowType.RED_SOURCE, // RED SOURCE
    ArrowType.DETECTOR, // DETECTOR
    ArrowType.RED_IMPULSE, // RED IMPULSE
    ArrowType.BUTTON, // SOURCE BUTTON
]);

export const ENTRY_POINTS = new Set([
    ArrowType.RED_SOURCE, // RED SOURCE
    ArrowType.RED_IMPULSE, // RED IMPULSE
    ArrowType.LOGIC_NOT, // LOGIC NOT
    ArrowType.BUTTON,
    ArrowType.BRUH_BUTTON,
]);

export const ADDITIONAL_UPDATE_ARROWS = new Set([
    ArrowType.DELAY, // DELAY
    ArrowType.DETECTOR, // DETECTOR
    ArrowType.RED_IMPULSE, // RED IMPULSE
    ArrowType.LOGIC_NOT, // LOGIC NOT
    ArrowType.LOGIC_FLOP,
    ArrowType.LOGIC_FLIP,
    ArrowType.BUTTON,
    ArrowType.BRUH_BUTTON,
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

export const DETECTOR_HANDLER = new ArrowHandler(
    1,
    (arrow: any, x: number, y: number, chunk: any) => [
        getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
    ],
    (arrow: any) => {
        arrow.signal = +(arrow.detectorSignal > 0);
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
    [ArrowType.RED_ARROW, RED_ARROW_HANDLER],
    [ArrowType.RED_SOURCE, RED_SOURCE_HANDLER],
    [ArrowType.BLOCKER, RED_ARROW_HANDLER],
    [ArrowType.RED_ARROW, RED_ARROW_HANDLER],
    [ArrowType.DELAY, DELAY_ARROW_HANDLER],
    [ArrowType.DETECTOR, DETECTOR_HANDLER],
    [ArrowType.SPLITTER_1, SPLITTER_1_HANDLER],
    [ArrowType.SPLITTER_2, SPLITTER_2_HANDLER],
    [ArrowType.SPLITTER_3, SPLITTER_3_HANDLER],
    [ArrowType.RED_IMPULSE, IMPULSE_HANDLER],
    [ArrowType.BLUE_ARROW, BLUE_ARROW_HANDLER],
    [ArrowType.BLUE_DIAGONAL_ARROW, BLUE_DIAGONAL_ARROW_HANDLER],
    [ArrowType.BLUE_SPLITTER_1, BLUE_SPLITTER_1_HANDLER],
    [ArrowType.BLUE_SPLITTER_2, BLUE_SPLITTER_2_HANDLER],
    [ArrowType.BLUE_SPLITTER_3, BLUE_SPLITTER_3_HANDLER],
    [ArrowType.LOGIC_NOT, LOGIC_NOT_HANDLER],
    [ArrowType.LOGIC_AND, LOGIC_AND_HANDLER],
    [ArrowType.LOGIC_XOR, LOGIC_XOR_HANDLER],
    [ArrowType.LOGIC_FLIP, LOGIC_FLIP_HANDLER],
    [ArrowType.LOGIC_FLOP, LOGIC_FLOP_HANDLER],
    [ArrowType.RANDOM, RANDOM_HANDLER],
    [ArrowType.BUTTON, BUTTON_HANDLER],
    [ArrowType.LEVEL_ARROW_22, EMPTY_HANDLER],
    [ArrowType.LEVEL_ARROW_23, EMPTY_HANDLER],
    [ArrowType.BRUH_BUTTON, BRUH_BUTTON_HANDLER],
]);