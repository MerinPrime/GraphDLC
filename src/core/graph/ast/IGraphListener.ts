import type { GraphCycle } from './CycleTypes';
import type { Graph } from './Graph';
import type { GraphNode } from './GraphNode';

export interface IGraphListener {
    onGraphClear(graph: Graph): void;
    onLinkAdded(graph: Graph, fromNode: GraphNode, toNode: GraphNode): void;
    onLinkRemoved(graph: Graph, fromNode: GraphNode, toNode: GraphNode): void;
    onNodeTypeChanged(graph: Graph, node: GraphNode): void;
    onCycleAdded(graph: Graph, cycle: GraphCycle): void;
    onCycleRemoved(graph: Graph, cycle: GraphCycle): void;
}
