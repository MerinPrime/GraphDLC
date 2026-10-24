import type { ITask } from 'src/core/task/ITask';
import type { GraphNode } from '../GraphNode';

export class PathSearchTask implements ITask<void> {
    public isCanceled = false;
    public readonly stepBatchSize = 100;

    private readonly queue: GraphNode[] = [];
    private queueHead = 0;
    private readonly queueSet = new Set<GraphNode>();

    public constructor(
        private readonly onProcessNode: (node: GraphNode) => void,
        private readonly onIdle: () => void,
    ) {}

    public pushNode(node: GraphNode): void {
        if (!this.queueSet.has(node)) {
            this.queueSet.add(node);
            this.queue.push(node);
        }
    }

    public pushNodes(nodes: Iterable<GraphNode>): void {
        for (const node of nodes) {
            this.pushNode(node);
        }
    }

    public step(maxStepsCount: number): boolean {
        if (this.isCanceled) return true;

        let steps = 0;
        while (this.queueHead < this.queue.length && steps < maxStepsCount) {
            const node = this.queue[this.queueHead++];
            this.queueSet.delete(node);
            steps++;

            this.onProcessNode(node);
        }

        if (this.queueHead > 1000) {
            this.queue.splice(0, this.queueHead);
            this.queueHead = 0;
        }

        if (this.queueHead >= this.queue.length) {
            this.clear();
            this.onIdle();
            return true;
        }

        return false;
    }

    public clear(): void {
        this.queue.length = 0;
        this.queueHead = 0;
        this.queueSet.clear();
    }

    public getResult(): void {}
}
