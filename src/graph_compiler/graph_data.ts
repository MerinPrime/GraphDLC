import {GraphNode} from "./graph_node";
import {Path} from "./path";
import {Timer} from "./timer";
import {Graph} from "./graph";

export class GraphData {
    changed_nodes: Set<GraphNode>;
    cycles_to_update: Set<Graph>;
    delayed_update: Set<GraphNode>;
    pathes: Array<Path>;
    timers: Array<Timer>;
    
    constructor() {
        this.changed_nodes = new Set();
        this.cycles_to_update = new Set();
        this.delayed_update = new Set();
        this.pathes = [];
        this.timers = [];
    }
    
    clear() {
        this.changed_nodes.clear();
        this.cycles_to_update.clear();
        this.delayed_update.clear();
        this.pathes.length = 0;
        this.timers.length = 0;
    }
}