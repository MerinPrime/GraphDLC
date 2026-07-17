import type { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import type { ITask } from 'src/core/task/ITask';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeType } from '../../engines/core/NodeType';
import type { DebugChunk } from '../DebugChunk';
import { DebuggerMode } from '../DebuggerMode';
import type { DebugColor, INodeDebugData } from '../types';

const ALPHA = 0.25;
const HASH_COLORS: DebugColor[] = [
    [0.8, 0.2, 0.2, ALPHA],
    [0.2, 0.8, 0.2, ALPHA],
    [0.2, 0.2, 0.8, ALPHA],
    [0.8, 0.8, 0.2, ALPHA],
    [0.8, 0.2, 0.8, ALPHA],
    [0.2, 0.8, 0.8, ALPHA],
] as const;

class UpdateSignalTask implements ITask<void> {
    public isCanceled = false;
    public stepBatchSize = 1;

    public constructor(
        private node: GraphNode,
        private debugChunk: DebugChunk,
    ) {}

    public step(_batchSize: number): boolean {
        const chunk = this.debugChunk;

        if (this.node.type === NodeType.EMPTY) {
            chunk.setColor(this.node.localX, this.node.localY, [0, 0, 0, 0]);
            return true;
        }

        let hash = this.node.type;
        this.node.backLinks.forEach((link) => {
            if (link.type !== NodeType.EMPTY) hash += link.type;
        });

        const color = HASH_COLORS[hash % HASH_COLORS.length];

        chunk.setColor(this.node.localX, this.node.localY, color);

        return true;
    }

    public getResult(): void {}
}

export class SignalPropagationDebuggerMode extends DebuggerMode<INodeDebugData> {
    public constructor(asyncScheduler: AsyncScheduler) {
        super(asyncScheduler, () => ({}));
    }

    protected doRunTask(
        _graph: Graph,
        _node: GraphNode,
        _data: INodeDebugData,
    ): boolean {
        return true;
    }

    protected runUpdateTask(
        _graph: Graph,
        node: GraphNode,
        _data: INodeDebugData,
    ): [ITask<void>, boolean] {
        const debugChunk = this.getDebugChunk(node.chunkIdx);
        return [new UpdateSignalTask(node, debugChunk), true];
    }
}
