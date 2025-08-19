import {GraphNode} from "../graph_node";
import {Graph} from "../graph";

export class GraphBuffer {
    changed_nodes: Set<GraphNode>;
    cycles_to_update: Set<Graph>;
    delayed_update: Set<GraphNode>;

    constructor() {
        this.changed_nodes = new Set();
        this.cycles_to_update = new Set();
        this.delayed_update = new Set();
    }
    
    clear() {
        this.changed_nodes.clear();
        this.cycles_to_update.clear();
        this.delayed_update.clear();
    }
}
