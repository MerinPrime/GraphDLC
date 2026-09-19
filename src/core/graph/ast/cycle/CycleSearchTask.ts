import type { ITask } from 'src/core/task/ITask';
import type { GraphNode } from '../GraphNode';
import { canBeInCycle } from './utils';

export class CycleSearchTask implements ITask<void> {
    public isCanceled = false;

    public readonly candidateQueue: GraphNode[] = [];
    private candidateHead = 0;
    private readonly queueSet = new Set<GraphNode>();

    private readonly pathStack: GraphNode[] = [];
    private readonly edgeIndexStack: number[] = [];
    private readonly inPathSet = new Set<GraphNode>();

    public constructor(
        private readonly onCycleFound: (path: GraphNode[]) => void,
        private readonly onIdle: () => void,
    ) {}

    public pushCandidate(node: GraphNode): void {
        if (!this.queueSet.has(node)) {
            this.queueSet.add(node);
            this.candidateQueue.push(node);
        }
    }

    public clear(): void {
        this.candidateQueue.length = 0;
        this.candidateHead = 0;
        this.queueSet.clear();
        this.resetDFS();
    }

    private compactQueue(): void {
        if (this.candidateHead > 500) {
            this.candidateQueue.splice(0, this.candidateHead);
            this.candidateHead = 0;
        }
    }

    public step(maxStepsCount: number): boolean {
        if (this.isCanceled) return true;

        let stepsRun = 0;

        while (stepsRun < maxStepsCount) {
            if (this.pathStack.length === 0) {
                if (this.candidateHead >= this.candidateQueue.length) {
                    this.clear();
                    this.onIdle();
                    return true;
                }

                this.compactQueue();

                const root = this.candidateQueue[this.candidateHead++];
                this.queueSet.delete(root);

                if (canBeInCycle(root)) {
                    this.resetDFS();
                    this.pushToPath(root);
                } else {
                    continue;
                }
            }

            while (this.pathStack.length > 0 && stepsRun < maxStepsCount) {
                stepsRun++;

                const depth = this.pathStack.length - 1;
                const current = this.pathStack[depth];
                const edgeIdx = this.edgeIndexStack[depth];

                if (!canBeInCycle(current)) {
                    this.popFromPath();
                    continue;
                }

                const links = current.links;

                if (edgeIdx >= links.length) {
                    this.popFromPath();
                    continue;
                }

                const next = links[edgeIdx];
                this.edgeIndexStack[depth]++;

                if (this.inPathSet.has(next)) {
                    const cycleStartIdx = this.pathStack.indexOf(next);
                    if (cycleStartIdx !== -1) {
                        const cycleLen = this.pathStack.length - cycleStartIdx;
                        if (cycleLen >= 2) {
                            this.onCycleFound(
                                this.pathStack.slice(cycleStartIdx),
                            );
                        }
                    }
                    continue;
                }

                if (canBeInCycle(next)) {
                    this.pushToPath(next);
                }
            }
        }

        return false;
    }

    public getResult(): void {
        return;
    }

    private resetDFS(): void {
        this.pathStack.length = 0;
        this.edgeIndexStack.length = 0;
        this.inPathSet.clear();
    }

    private pushToPath(node: GraphNode): void {
        this.pathStack.push(node);
        this.edgeIndexStack.push(0);
        this.inPathSet.add(node);
    }

    private popFromPath(): void {
        const node = this.pathStack.pop();
        this.edgeIndexStack.pop();
        if (node) {
            this.inPathSet.delete(node);
        }
    }
}
