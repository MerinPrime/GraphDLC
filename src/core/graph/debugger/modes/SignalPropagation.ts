import type { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import type { ITask } from 'src/core/task/ITask';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeType } from '../../engines/core/NodeType';
import { DebuggerMode } from '../DebuggerMode';
import type { DebugColor, INodeDebugData } from '../types';

const ALPHA = 0.25;
const HASH_COLORS: readonly DebugColor[] = [
    [0.8, 0.2, 0.2, ALPHA],
    [0.2, 0.8, 0.2, ALPHA],
    [0.2, 0.2, 0.8, ALPHA],
    [0.8, 0.8, 0.2, ALPHA],
    [0.8, 0.2, 0.8, ALPHA],
    [0.2, 0.8, 0.8, ALPHA],
] as const;

class BatchUpdateSignalTask implements ITask<void> {
    public isCanceled = false;
    public stepBatchSize = 500;
    private nodes: GraphNode[];
    private index = 0;

    public constructor(
        nodes: GraphNode[],
        private mode: SignalPropagationDebuggerMode,
    ) {
        this.nodes = nodes;
    }

    public step(batchSize: number): boolean {
        if (this.isCanceled) return true;
        const limit = Math.min(this.index + batchSize, this.nodes.length);
        for (let i = this.index; i < limit; i++) {
            this.mode.updateNodeColor(this.nodes[i]);
        }
        this.index = limit;
        return this.index >= this.nodes.length;
    }

    public getResult(): void {}
}

export class SignalPropagationDebuggerMode extends DebuggerMode<INodeDebugData> {
    private dirtyNodes = new Set<GraphNode>();
    private isScheduled = false;

    public constructor(asyncScheduler: AsyncScheduler) {
        super(asyncScheduler, () => ({}));
    }

    public override performNodeUpdate(_graph: Graph, node: GraphNode): void {
        this.dirtyNodes.add(node);
        this.scheduleBatch();
    }

    private scheduleBatch(): void {
        if (this.isScheduled || this.dirtyNodes.size === 0) return;
        this.isScheduled = true;

        const nodesToProcess = Array.from(this.dirtyNodes);
        this.dirtyNodes.clear();

        this.asyncScheduler.schedule(
            new BatchUpdateSignalTask(nodesToProcess, this),
            () => {
                this.isScheduled = false;
                if (this.dirtyNodes.size > 0) {
                    this.scheduleBatch();
                }
            },
            'batch-signal-update',
        );
    }

    public override onGraphClear(graph: Graph): void {
        this.dirtyNodes.clear();
        this.isScheduled = false;
        super.onGraphClear(graph);
    }

    public updateNodeColor(node: GraphNode): void {
        const chunk = this.getDebugChunk(node.chunkIdx);
        if (!chunk) return;

        if (node.type === NodeType.EMPTY) {
            chunk.setColor(node.localX, node.localY, [0, 0, 0, 0]);
            return;
        }

        let hash = node.type;
        const backLinks = node.backLinks;
        for (let i = 0; i < backLinks.length; i++) {
            const link = backLinks[i];
            if (link.type !== NodeType.EMPTY) hash += link.type;
        }

        const color = HASH_COLORS[hash % HASH_COLORS.length];
        chunk.setColor(node.localX, node.localY, color);
    }
}
