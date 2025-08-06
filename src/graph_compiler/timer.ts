import {GraphNode} from "./graph_node";

export class Timer {
    length: number;
    offset: number;
    tick: number;
    arrow: GraphNode;
    
    constructor(length: number, offset: number, arrow: GraphNode) {
        this.length = length;
        this.offset = offset;
        this.tick = offset;
        this.arrow = arrow;
    }
}