import type { ITask } from './ITask';

interface SchedulerEntry {
    task: ITask<any>;
    key?: any;
    onComplete: (result: any) => void;
}

export class AsyncScheduler {
    private tasksQueue: SchedulerEntry[] = [];
    private queueHead = 0;
    private activeTasksByKey = new Map<any, SchedulerEntry>();
    private isSchedulerRunning = false;

    private readonly getBudget: () => number;

    public constructor(getBudget: () => number) {
        this.getBudget = getBudget;
    }

    public schedule<K, R>(
        task: ITask<R>,
        onComplete: (result: R) => void,
        key?: K,
    ) {
        if (key !== undefined) {
            this.cancel(key);
        }

        const entry: SchedulerEntry = { task, key, onComplete };
        this.tasksQueue.push(entry);

        if (key !== undefined) {
            this.activeTasksByKey.set(key, entry);
        }

        this.ensureSchedulerStarted();
    }

    public cancel(key: any) {
        const entry = this.activeTasksByKey.get(key);
        if (entry) {
            entry.task.isCanceled = true;
            this.activeTasksByKey.delete(key);
        }
    }

    public clear() {
        this.tasksQueue.length = 0;
        this.queueHead = 0;
        this.activeTasksByKey.clear();
        this.isSchedulerRunning = false;
    }

    private ensureSchedulerStarted() {
        if (this.isSchedulerRunning) return;
        this.isSchedulerRunning = true;

        const tick = () => {
            const budget = this.getBudget();

            if (budget === 0) {
                this.clear();
                return;
            }

            while (
                this.queueHead < this.tasksQueue.length &&
                this.tasksQueue[this.queueHead].task.isCanceled
            ) {
                this.queueHead++;
            }

            if (this.queueHead >= this.tasksQueue.length) {
                this.clear();
                return;
            }

            const startTime = performance.now();

            let processedTasks = 0;
            const total = this.tasksQueue.length;

            while (processedTasks < total) {
                if (performance.now() - startTime > budget) {
                    break;
                }

                if (this.queueHead >= this.tasksQueue.length) {
                    this.queueHead = 0;
                }

                const entry = this.tasksQueue[this.queueHead];

                this.queueHead++;
                processedTasks++;

                if (entry.task.isCanceled) continue;

                const isFinished = entry.task.step(
                    entry.task.stepBatchSize ?? 50,
                );

                if (isFinished) {
                    if (entry.key !== undefined) {
                        this.activeTasksByKey.delete(entry.key);
                    }

                    const result = entry.task.getResult();
                    entry.onComplete(result);

                    entry.task.isCanceled = true;
                }
            }

            if (this.queueHead > 1000) {
                this.tasksQueue = this.tasksQueue.slice(this.queueHead);
                this.queueHead = 0;
            }

            if (this.isSchedulerRunning) {
                requestAnimationFrame(tick);
            }
        };

        requestAnimationFrame(tick);
    }

    public forceComplete<R>(key: any): R | undefined {
        const entry = this.activeTasksByKey.get(key);
        if (!entry) {
            return undefined;
        }

        this.activeTasksByKey.delete(key);

        let isFinished = false;
        while (!isFinished) {
            isFinished = entry.task.step(1000);
        }

        const result = entry.task.getResult();
        entry.onComplete(result);

        return result;
    }
}
