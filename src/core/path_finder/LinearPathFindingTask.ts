import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { ITask } from '../task/ITask';
import type { ArrowType } from '../utils/ArrowType';
import type { PathStep } from './types';

export class LinearPathFindingTask implements ITask<PathStep[] | null> {
    public isCanceled = false;
    public stepBatchSize = 40;

    private readonly gameMap: GameMap;
    private readonly startX: number;
    private readonly startY: number;
    private readonly endX: number;
    private readonly endY: number;

    private isDone = false;
    private resultPath: PathStep[];
    private arrowType: ArrowType;

    public constructor(
        gameMap: GameMap,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        arrowType: ArrowType,
    ) {
        this.gameMap = gameMap;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.arrowType = arrowType;
        this.resultPath = [];
    }

    public step(maxStepsCount: number): boolean {
        if (this.isDone || this.isCanceled) {
            return true;
        }

        let x = this.startX;
        let y = this.startY;

        const dx = Math.abs(this.endX - this.startX);
        const dy = Math.abs(this.endY - this.startY);
        const sx = this.startX < this.endX ? 1 : -1;
        const sy = this.startY < this.endY ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this.resultPath.push({
                x,
                y,
                type: this.arrowType,
                rotation: 0,
                flipped: false,
            });

            if (x === this.endX && y === this.endY) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }

        return true;
    }

    public getResult(): PathStep[] {
        return this.resultPath;
    }
}
