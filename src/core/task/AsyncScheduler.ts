import type { ITask } from './ITask';

interface SchedulerEntry {
    task: ITask<any>;
    key?: any;
    onComplete: (result: any) => void;
}

const activeSchedulers = new Set<AsyncScheduler>();
let isSchedulersGloballyStarted = false;

export function startSchedulers(): void {
    if (isSchedulersGloballyStarted) return;
    isSchedulersGloballyStarted = true;

    for (const scheduler of activeSchedulers) {
        scheduler.startIfPending();
    }
}

export class AsyncScheduler {
    private tasksQueue: SchedulerEntry[] = [];
    private queueHead = 0;
    private activeTasksByKey = new Map<any, SchedulerEntry>();
    private isSchedulerRunning = false;

    private readonly getBudget: () => number;

    public constructor(getBudget: () => number) {
        this.getBudget = getBudget;
        activeSchedulers.add(this);
    }

    public schedule<K, R>(
        task: ITask<R>,
        onComplete: (result: R) => void,
        key?: K,
    ) {
        if (key !== undefined) {
            const existing = this.activeTasksByKey.get(key);
            if (existing) {
                const existingIdx = this.tasksQueue.indexOf(
                    existing,
                    this.queueHead,
                );
                if (existingIdx >= this.queueHead) {
                    existing.task.isCanceled = true;
                    existing.task = task;
                    existing.task.isCanceled = false;
                    existing.onComplete = onComplete;
                    this.ensureSchedulerStarted();
                    return;
                }
                this.cancel(key);
            }
        }

        const entry: SchedulerEntry = { task, key, onComplete };
        this.tasksQueue.push(entry);

        if (key !== undefined) {
            this.activeTasksByKey.set(key, entry);
        }

        if (isSchedulersGloballyStarted) {
            this.ensureSchedulerStarted();
        }
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

    public startIfPending() {
        if (this.queueHead < this.tasksQueue.length) {
            this.ensureSchedulerStarted();
        }
    }

    public destroy() {
        this.clear();
        activeSchedulers.delete(this);
    }

    private ensureSchedulerStarted() {
        if (this.isSchedulerRunning) return;
        this.isSchedulerRunning = true;

        const tick = () => {
            if (!isSchedulersGloballyStarted) {
                this.isSchedulerRunning = false;
                return;
            }

            const budget = this.getBudget();

            if (budget === 0) {
                requestAnimationFrame(tick);
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

            while (this.queueHead < this.tasksQueue.length) {
                if (performance.now() - startTime > budget) {
                    break;
                }

                const entry = this.tasksQueue[this.queueHead];
                if (entry.task.isCanceled) {
                    this.queueHead++;
                    continue;
                }

                const isFinished = entry.task.step(
                    entry.task.stepBatchSize ?? 50,
                );

                if (isFinished) {
                    this.queueHead++;
                    if (entry.key !== undefined) {
                        this.activeTasksByKey.delete(entry.key);
                    }

                    const result = entry.task.getResult();
                    entry.onComplete(result);
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
