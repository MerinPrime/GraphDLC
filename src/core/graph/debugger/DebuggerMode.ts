import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import type { ITask } from 'src/core/task/ITask';
import type { Bounds } from 'src/core/utils/Bounds';
import type { GraphCycle } from '../ast/CycleTypes';
import type { Graph } from '../ast/Graph';
import type { GraphNode } from '../ast/GraphNode';
import type { IGraphListener } from '../ast/IGraphListener';
import { DebugChunk } from './DebugChunk';
import type { INodeDebugData, RenderDebugColor } from './types';

export abstract class DebuggerMode<TNodeDebugData extends INodeDebugData>
    implements IGraphListener
{
    private nodeDataConstructor: () => TNodeDebugData;

    protected asyncScheduler: AsyncScheduler;
    private debugChunks: DebugChunk[] = [];
    private nodeDatas: TNodeDebugData[] = [];

    public constructor(
        asyncScheduler: AsyncScheduler,
        nodeDataConstructor: () => TNodeDebugData,
    ) {
        this.asyncScheduler = asyncScheduler;
        this.nodeDataConstructor = nodeDataConstructor;
    }

    public syncWithGraph(graph: Graph) {
        graph.getChunks().forEach((chunk) => {
            if (chunk.astIndex != null)
                this.onChunkAdded(graph, chunk, chunk.astIndex);
        });
        graph.getNodes().forEach((node) => {
            this.performNodeUpdate(graph, node);
        });
    }

    public getNodeData(nodeIdx: number): TNodeDebugData {
        const nodeData = this.nodeDatas[nodeIdx];
        if (nodeData) return nodeData;
        const newNodeData = this.nodeDataConstructor();
        this.nodeDatas[nodeIdx] = newNodeData;
        return newNodeData;
    }

    public getDebugChunk(chunkIdx: number): DebugChunk {
        return this.debugChunks[chunkIdx];
    }

    public performNodeUpdate(graph: Graph, node: GraphNode): void {
        const nodeData = this.getNodeData(node.nodeIdx);

        const doTask = this.doRunTask(graph, node, nodeData);
        if (!doTask) return;

        const [task, doReset, customKey] = this.runUpdateTask(
            graph,
            node,
            nodeData,
        );
        const key = doReset ? (customKey ?? node.nodeIdx) : undefined;
        this.asyncScheduler.schedule(task, () => {}, key);
    }

    protected abstract doRunTask(
        graph: Graph,
        node: GraphNode,
        nodeData: TNodeDebugData,
    ): boolean;

    protected abstract runUpdateTask(
        graph: Graph,
        node: GraphNode,
        nodeData: TNodeDebugData,
    ): [task: ITask<void>, doReset: boolean, customKey?: any];

    public onGraphClear(_graph: Graph): void {
        this.asyncScheduler.clear();
        this.debugChunks.length = 0;
        this.nodeDatas.length = 0;
    }

    public onChunkAdded(_graph: Graph, chunk: Chunk, chunkIdx: number): void {
        this.debugChunks[chunkIdx] = new DebugChunk(chunkIdx, chunk.x, chunk.y);
    }

    public onNodeAdded(graph: Graph, node: GraphNode): void {
        this.nodeDatas[node.nodeIdx] = this.nodeDataConstructor();
        this.performNodeUpdate(graph, node);
    }

    public onLinkAdded(
        graph: Graph,
        fromNode: GraphNode,
        toNode: GraphNode,
    ): void {
        this.performNodeUpdate(graph, fromNode);
        this.performNodeUpdate(graph, toNode);
    }

    public onLinkRemoved(
        graph: Graph,
        fromNode: GraphNode,
        toNode: GraphNode,
    ): void {
        this.performNodeUpdate(graph, fromNode);
        this.performNodeUpdate(graph, toNode);
    }

    public onNodeTypeChanged(graph: Graph, node: GraphNode): void {
        this.performNodeUpdate(graph, node);
    }

    public onCycleAdded(graph: Graph, cycle: GraphCycle): void {
        cycle.heads.forEach((head) => {
            this.performNodeUpdate(graph, head);
        });
        cycle.nodes.forEach((node) => {
            this.performNodeUpdate(graph, node);
        });
    }

    public onCycleRemoved(graph: Graph, cycle: GraphCycle): void {
        cycle.heads.forEach((head) => {
            this.performNodeUpdate(graph, head);
        });
        cycle.nodes.forEach((node) => {
            this.performNodeUpdate(graph, node);
        });
    }

    public renderChunks(bounds: Bounds, renderColor: RenderDebugColor) {
        for (const chunk of this.debugChunks) {
            if (chunk?.inBounds(bounds)) {
                chunk.renderChunk(renderColor);
            }
        }
    }
}
