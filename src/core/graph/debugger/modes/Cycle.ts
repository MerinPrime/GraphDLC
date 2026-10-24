import type { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import type { ITask } from 'src/core/task/ITask';
import { CycleHeadType } from '../../ast/cycle/types';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { DebuggerMode } from '../DebuggerMode';
import type { DebugColor, INodeDebugData } from '../types';

const ALPHA = 0.25;

const HEAD_COLORS: Record<CycleHeadType, DebugColor> = {
    [CycleHeadType.NONE]: [0.0, 0.0, 0.0, 0.0],
    [CycleHeadType.READ]: [0.2, 0.2, 0.8, ALPHA],
    [CycleHeadType.WRITE]: [0.2, 0.8, 0.2, ALPHA],
    [CycleHeadType.CLEAR]: [0.8, 0.2, 0.2, ALPHA],
    [CycleHeadType.XOR_WRITE]: [0.8, 0.8, 0.2, ALPHA],
};

const CYCLE_COLOR: DebugColor = [0.8, 0.2, 0.8, ALPHA];
const EXTRA_COLOR: DebugColor = [0.5, 0.4, 0.7, ALPHA];

class BatchUpdateCycleTask implements ITask<void> {
    public isCanceled = false;
    public stepBatchSize = 500;
    private nodes: GraphNode[];
    private index = 0;

    public constructor(
        nodes: GraphNode[],
        private mode: CycleDebuggerMode,
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

export class CycleDebuggerMode extends DebuggerMode<INodeDebugData> {
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
            new BatchUpdateCycleTask(nodesToProcess, this),
            () => {
                this.isScheduled = false;
                if (this.dirtyNodes.size > 0) {
                    this.scheduleBatch();
                }
            },
            'batch-cycle-update',
        );
    }

    public override onGraphClear(graph: Graph): void {
        this.dirtyNodes.clear();
        this.isScheduled = false;
        super.onGraphClear(graph);
    }

    public updateNodeColor(node: GraphNode): void {
        const debugChunk = this.getDebugChunk(node.chunkIdx);
        if (!debugChunk) return;

        let color: DebugColor = [0, 0, 0, 0];

        if (node.headType !== null && node.headType !== CycleHeadType.NONE) {
            color = HEAD_COLORS[node.headType];
        } else if (node.isCycle) {
            color = CYCLE_COLOR;
        } else if (node.cycleRef?.extraNodes.includes(node)) {
            color = EXTRA_COLOR;
        }

        debugChunk.setColor(node.localX, node.localY, color);
    }
}
