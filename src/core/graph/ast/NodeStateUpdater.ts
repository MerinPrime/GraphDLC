import type { Graph } from './Graph';
import type { GraphNode } from './GraphNode';

export class NodeStateUpdater {
    private loading = false;

    private readonly pendingNodes = new Set<GraphNode>();
    private maxNodeIdx = -1;

    public constructor(private readonly graph: Graph) {}

    public beginLoading(): void {
        this.loading = true;

        this.pendingNodes.clear();
        this.maxNodeIdx = -1;
    }

    public endLoading(): void {
        this.loading = false;

        if (this.maxNodeIdx !== -1) {
            this.graph.engine.ensureNodeCapacity(this.maxNodeIdx + 1);
        }

        for (const node of this.pendingNodes) {
            this.graph.engine.updateNodeState(node);
        }

        this.pendingNodes.clear();
        this.maxNodeIdx = -1;
    }

    public update(node: GraphNode): void {
        if (!this.loading) {
            this.graph.engine.updateNodeState(node);
            return;
        }

        this.pendingNodes.add(node);

        this.maxNodeIdx = Math.max(this.maxNodeIdx, node.nodeIdx);
    }
}
