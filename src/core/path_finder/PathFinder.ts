import type { GameMap } from '@logic-arrows/game-logic/game-map';
import { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import { PathFindingTask } from './PathFindingTask';
import type { PathStep } from './types';

export class PathFinder {
    private readonly scheduler = new AsyncScheduler(() => 33);

    public findPathAsync(
        key: any,
        gameMap: GameMap,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        onComplete: (path: PathStep[] | null) => void,
    ): void {
        const task = new PathFindingTask(gameMap, startX, startY, endX, endY);
        this.scheduler.schedule(task, onComplete, key);
    }

    public forceCompletePath(key: any): PathStep[] | null {
        return this.scheduler.forceComplete<PathStep[] | null>(key) ?? null;
    }

    public cancelPathSearch(key: any): void {
        this.scheduler.cancel(key);
    }
}
