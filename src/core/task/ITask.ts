export interface ITask<R> {
    step(batchSize: number): boolean;
    getResult(): R;

    isCanceled: boolean;
    stepBatchSize?: number;
}
