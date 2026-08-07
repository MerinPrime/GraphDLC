import type { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import type { ITask } from 'src/core/task/ITask';
import { CycleHeadType } from '../../ast/cycle/CycleTypes';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import type { DebugChunk } from '../DebugChunk';
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

class UpdateCycleTask implements ITask<void> {
    public isCanceled = false;
    public stepBatchSize = 1;

    public constructor(
        private node: GraphNode,
        private debugChunk: DebugChunk,
    ) {}

    public step(_batchSize: number): boolean {
        let color: DebugColor | null = [0, 0, 0, 0];

        if (
            this.node.headType !== null &&
            this.node.headType !== CycleHeadType.NONE
        ) {
            color = HEAD_COLORS[this.node.headType];
        } else if (this.node.isCycle) {
            color = CYCLE_COLOR;
        }

        this.debugChunk.setColor(this.node.localX, this.node.localY, color);

        return true;
    }

    public getResult(): void {}
}

export class CycleDebuggerMode extends DebuggerMode<INodeDebugData> {
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
        return [new UpdateCycleTask(node, debugChunk), true];
    }
}
