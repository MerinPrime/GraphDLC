import {GraphNode} from "./graph_node";

export class GraphNodeCycle {
    public arrows: Set<GraphNode>;
    
    constructor(arrows: Set<GraphNode>) {
        this.arrows = new Set<GraphNode>(arrows);
    }
}