import {ArrowHandler} from "./handlers";
import {Arrow} from "../api/arrow";

export class GraphNode {
    public arrow: Arrow;
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