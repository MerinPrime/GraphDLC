import {ArrowHandler} from "./handlers";

export class GraphNode {
    public arrow: any;
    public handler?: ArrowHandler;
    public edges: GraphNode[];
    public detectors: GraphNode[];

    constructor(arrow: any, handler: ArrowHandler) {
        if (handler == null) {
            console.trace(arrow, handler);
        }
        this.arrow = arrow;
        this.handler = handler;
        this.edges = [];
        this.detectors = [];
        
        arrow.graph_node = this;
    }
}