import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { GraphCycle } from './CycleTypes';
import type { Graph } from './Graph';
import type { GraphNode } from './GraphNode';

export interface IGraphListener {
    onGraphClear(graph: Graph): void;

    onChunkAdded(graph: Graph, chunk: Chunk, chunkIdx: number): void;
    onNodeAdded(graph: Graph, node: GraphNode): void;

    onLinkAdded(graph: Graph, fromNode: GraphNode, toNode: GraphNode): void;
    onLinkRemoved(graph: Graph, fromNode: GraphNode, toNode: GraphNode): void;
    onNodeTypeChanged(graph: Graph, node: GraphNode): void;

    onCycleAdded(graph: Graph, cycle: GraphCycle): void;
    onCycleRemoved(graph: Graph, cycle: GraphCycle): void;
}
