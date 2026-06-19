import type { ITask } from 'src/core/task/ITask';
import type { GraphNode } from '../GraphNode';
import { canBeInCycle } from './utils';

export class CycleSearchTask implements ITask<GraphNode[] | null> {
    public readonly startNode: GraphNode;
    public readonly targetNode: GraphNode;

    public isCanceled = false;

    private queue: GraphNode[] = [];
    private head = 0;

    private readonly parentMap = new Map<GraphNode, GraphNode>();

    private isDone = false;
    private resultPath: GraphNode[] | null = null;

    public constructor(startNode: GraphNode, targetNode: GraphNode) {
        this.startNode = startNode;
        this.targetNode = targetNode;

        if (startNode === targetNode) {
            const links = startNode.links;
            for (let i = 0; i < links.length; i++) {
                const child = links[i];
                if (canBeInCycle(child)) {
                    this.queue.push(child);
                    this.parentMap.set(child, startNode);
                }
            }
        } else {
            this.queue.push(startNode);
            this.parentMap.set(startNode, startNode);
        }
    }

    public step(maxStepsCount: number): boolean {
        if (this.isDone || this.isCanceled) {
            return true;
        }

        let stepsRun = 0;

        while (this.head < this.queue.length && stepsRun < maxStepsCount) {
            const current = this.queue[this.head++];
            stepsRun++;

            const links = current.links;
            const linksLen = links.length;
            for (let i = 0; i < linksLen; i++) {
                const child = links[i];
                if (child === this.targetNode) {
                    this.buildPath(current);
                    this.complete(this.resultPath);
                    return true;
                }

                if (canBeInCycle(child) && !this.parentMap.has(child)) {
                    this.parentMap.set(child, current);
                    this.queue.push(child);
                }
            }
        }

        if (this.head >= this.queue.length) {
            this.complete(null);
            return true;
        }

        return false;
    }

    public getResult(): GraphNode[] | null {
        return this.resultPath;
    }

    private buildPath(lastNode: GraphNode): void {
        const path: GraphNode[] = [this.targetNode];
        let curr: GraphNode | undefined = lastNode;

        while (curr !== undefined && curr !== this.startNode) {
            path.push(curr);
            curr = this.parentMap.get(curr);
        }

        if (this.startNode !== this.targetNode) {
            path.push(this.startNode);
        }

        this.resultPath = path.reverse();
    }

    private complete(result: GraphNode[] | null): void {
        this.resultPath = result;
        this.isDone = true;

        this.queue = [];
        this.parentMap.clear();
    }
}
