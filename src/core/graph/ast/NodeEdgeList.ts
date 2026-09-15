import type { GraphNode } from './GraphNode';

export class NodeEdgeList {
    public readonly nodes: GraphNode[] = [];
    public readonly counts: number[] = [];

    public add(node: GraphNode): boolean {
        const idx = this.nodes.indexOf(node);
        if (idx !== -1) {
            this.counts[idx]++;
            return false;
        }

        this.nodes.push(node);
        this.counts.push(1);
        return true;
    }

    public remove(node: GraphNode): boolean {
        const idx = this.nodes.indexOf(node);
        if (idx === -1) return false;

        this.counts[idx]--;
        if (this.counts[idx] === 0) {
            const last = this.nodes.length - 1;
            this.nodes[idx] = this.nodes[last];
            this.counts[idx] = this.counts[last];
            this.nodes.pop();
            this.counts.pop();
            return true;
        }

        return false;
    }

    public has(node: GraphNode): boolean {
        return this.nodes.indexOf(node) !== -1;
    }

    public getCount(node: GraphNode): number {
        const idx = this.nodes.indexOf(node);
        return idx !== -1 ? this.counts[idx] : 0;
    }

    public get length(): number {
        return this.nodes.length;
    }

    public clear(): void {
        this.nodes.length = 0;
        this.counts.length = 0;
    }
}
