import type { GraphNode } from '../GraphNode';
import { canBeInCycle } from './utils';

export class CycleSearchTask {
    public readonly startNode: GraphNode;
    public readonly targetNode: GraphNode;

    public isCanceled = false;

    private queue: GraphNode[] = [];
    private head = 0;
    private visited = new Set<GraphNode>();
    private parentMap = new Map<GraphNode, GraphNode>();

    private isDone = false;
    private resultPath: GraphNode[] | null = null;

    public constructor(startNode: GraphNode, targetNode: GraphNode) {
        this.startNode = startNode;
        this.targetNode = targetNode;

        if (startNode === targetNode) {
            for (const child of startNode.next) {
                if (canBeInCycle(child)) {
                    this.queue.push(child);
                    this.visited.add(child);
                    this.parentMap.set(child, startNode);
                }
            }
        } else {
            this.queue.push(startNode);
            this.visited.add(startNode);
        }
    }

    public step(maxStepsCount: number): boolean {
        if (this.isDone || this.isCanceled) return true;

        let stepsRun = 0;
        while (this.head < this.queue.length && stepsRun < maxStepsCount) {
            const current = this.queue[this.head++];
            stepsRun++;

            if (!canBeInCycle(current) && current !== this.startNode) {
                continue;
            }

            for (const child of current.next) {
                if (child === this.targetNode) {
                    const path: GraphNode[] = [this.targetNode];
                    let curr: GraphNode | undefined = current;

                    while (curr !== undefined && curr !== this.startNode) {
                        path.push(curr);
                        curr = this.parentMap.get(curr);
                    }
                    if (this.startNode !== this.targetNode) {
                        path.push(this.startNode);
                    }
                    this.resultPath = path.reverse();
                    this.isDone = true;
                    return true;
                }

                if (!canBeInCycle(child)) continue;

                if (!this.visited.has(child)) {
                    this.visited.add(child);
                    this.parentMap.set(child, current);
                    this.queue.push(child);
                }
            }
        }

        if (this.head >= this.queue.length) {
            this.isDone = true;
            this.resultPath = null;
            return true;
        }

        return false;
    }

    public getResult(): GraphNode[] | null {
        return this.resultPath;
    }
}
