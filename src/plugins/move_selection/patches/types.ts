import type { ArrowData } from '@logic-arrows/game-logic/arrow-data';

export type Point = [x: number, y: number];

export interface MovingArrow {
    x: number;
    y: number;
    data: ArrowData;
}

export interface MoveSelectionContext {
    deltaX: number;
    deltaY: number;
    initArrows: MovingArrow[];
    mapSnapshot: Map<number, ArrowData>;
}
