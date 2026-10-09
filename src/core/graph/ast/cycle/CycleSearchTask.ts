import type { ITask } from 'src/core/task/ITask';
import type { GraphNode } from '../GraphNode';
import { canBeInCycle } from './utils';

export class CycleSearchTask implements ITask<void> {
    public isCanceled = false;
    public readonly stepBatchSize = 500;

    public readonly candidateQueue: GraphNode[] = [];
    private candidateHead = 0;
    private readonly queueSet = new Set<GraphNode>();

    private counter = 0;
    private readonly indexOf = new Map<GraphNode, number>();
    private readonly lowOf = new Map<GraphNode, number>();
    private readonly onStack = new Set<GraphNode>();
    private readonly sccStack: GraphNode[] = [];
    private readonly callStack: GraphNode[] = [];
    private readonly edgeStack: number[] = [];
    private currentRoot: GraphNode | null = null;

    private epochStale = false;

    public constructor(
        private readonly onCycleFound: (path: GraphNode[]) => void,
        private readonly onIdle: () => void,
    ) {}

    public pushCandidate(node: GraphNode): void {
        if (this.indexOf.size > 0) this.epochStale = true;

        if (!this.queueSet.has(node)) {
            this.queueSet.add(node);
            this.candidateQueue.push(node);
        }
    }

    public clear(): void {
        this.candidateQueue.length = 0;
        this.candidateHead = 0;
        this.queueSet.clear();
        this.resetEpoch();
    }

    public step(maxStepsCount: number): boolean {
        if (this.isCanceled) return true;

        if (this.epochStale) this.restartEpoch();

        let steps = 0;
        while (steps < maxStepsCount) {
            steps++;

            if (this.callStack.length === 0) {
                if (!this.pickRoot()) {
                    this.clear();
                    this.onIdle();
                    return true;
                }
                continue;
            }

            this.advance();
        }

        return false;
    }

    public getResult(): void {
        return;
    }

    private pickRoot(): boolean {
        if (this.candidateHead >= this.candidateQueue.length) return false;

        this.compactQueue();

        const root = this.candidateQueue[this.candidateHead++];
        this.queueSet.delete(root);

        if (
            !this.indexOf.has(root) &&
            this.isEligible(root) &&
            this.hasInCycleLink(root)
        ) {
            this.currentRoot = root;
            this.enter(root);
        }
        return true;
    }

    private enter(node: GraphNode): void {
        this.indexOf.set(node, this.counter);
        this.lowOf.set(node, this.counter);
        this.counter++;
        this.sccStack.push(node);
        this.onStack.add(node);
        this.callStack.push(node);
        this.edgeStack.push(0);
    }

    private advance(): void {
        const depth = this.callStack.length - 1;
        const v = this.callStack[depth];
        const links = v.links;
        const edgeIdx = this.edgeStack[depth];

        if (edgeIdx < links.length) {
            this.edgeStack[depth] = edgeIdx + 1;
            const w = links[edgeIdx];

            if (!this.indexOf.has(w)) {
                if (this.isEligible(w)) this.enter(w);
            } else if (this.onStack.has(w)) {
                const lowV = this.lowOf.get(v)!;
                const idxW = this.indexOf.get(w)!;
                if (idxW < lowV) this.lowOf.set(v, idxW);
            }
            return;
        }

        this.callStack.pop();
        this.edgeStack.pop();

        const lowV = this.lowOf.get(v)!;
        if (lowV === this.indexOf.get(v)) {
            const component: GraphNode[] = [];
            let node: GraphNode;
            do {
                node = this.sccStack.pop()!;
                this.onStack.delete(node);
                component.push(node);
            } while (node !== v);

            if (component.length >= 2) this.handleComponent(component);
        }

        if (this.callStack.length > 0) {
            const parent = this.callStack[this.callStack.length - 1];
            if (lowV < this.lowOf.get(parent)!) this.lowOf.set(parent, lowV);
        }

        if (this.callStack.length === 0) this.currentRoot = null;
    }

    private handleComponent(component: GraphNode[]): void {
        const set = new Set(component);

        let start = component[0];
        for (let n = 0; n < component.length; n++) {
            const node = component[n];
            let inner = 0;
            const links = node.links;
            for (let i = 0; i < links.length; i++) {
                if (set.has(links[i])) inner++;
            }
            if (inner !== 1) return;
            if (node.nodeIdx < start.nodeIdx) start = node;
        }

        const path: GraphNode[] = [];
        let current = start;
        do {
            path.push(current);
            const links = current.links;
            let next: GraphNode | null = null;
            for (let i = 0; i < links.length; i++) {
                if (set.has(links[i])) {
                    next = links[i];
                    break;
                }
            }
            if (next === null) return;
            current = next;
        } while (current !== start && path.length <= component.length);

        if (current === start && path.length === component.length) {
            this.onCycleFound(path);
        }
    }

    private isEligible(node: GraphNode): boolean {
        if (!canBeInCycle(node)) return false;
        const links = node.links;
        for (let i = 0; i < links.length; i++) {
            if (canBeInCycle(links[i])) return true;
        }
        return false;
    }

    private hasInCycleLink(node: GraphNode): boolean {
        const back = node.backLinks;
        for (let i = 0; i < back.length; i++) {
            if (canBeInCycle(back[i])) return true;
        }
        return false;
    }

    private restartEpoch(): void {
        const interrupted = this.callStack.length > 0 ? this.currentRoot : null;
        this.resetEpoch();
        if (interrupted !== null && !this.queueSet.has(interrupted)) {
            this.queueSet.add(interrupted);
            this.candidateQueue.push(interrupted);
        }
    }

    private resetEpoch(): void {
        this.counter = 0;
        this.indexOf.clear();
        this.lowOf.clear();
        this.onStack.clear();
        this.sccStack.length = 0;
        this.callStack.length = 0;
        this.edgeStack.length = 0;
        this.currentRoot = null;
        this.epochStale = false;
    }

    private compactQueue(): void {
        if (this.candidateHead > 500) {
            this.candidateQueue.splice(0, this.candidateHead);
            this.candidateHead = 0;
        }
    }
}
