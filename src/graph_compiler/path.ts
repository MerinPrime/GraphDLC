import {GraphNode} from "./graph_node";

export class Path {
    tick: number;
    arrow: GraphNode;
    delta: number;

    constructor(tick: number, arrow: GraphNode, delta: number) {
        this.tick = tick;
        this.arrow = arrow;
        this.delta = delta;
    }
}