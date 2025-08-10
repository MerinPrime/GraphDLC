import {GraphNode} from "./graph_node";

export class Timer {
    length: number;
    offset: number;
    tick: number;
    arrows: GraphNode[];
    restarted: boolean;
    
    constructor(length: number, offset: number, arrows: GraphNode[]) {
        this.length = length;
        this.offset = offset;
        this.tick = offset;
        this.arrows = arrows;
        this.restarted = true;
    }
}