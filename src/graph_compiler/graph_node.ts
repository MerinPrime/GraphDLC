import {ArrowHandler} from "./handlers";
import {Arrow} from "../api/arrow";
import {Graph} from "./graph";
import {CycleInfo} from "./compiled_map_graph";

export class GraphNode {
    public arrow: Arrow;
    public handler?: ArrowHandler;
    public back: GraphNode[];
    public edges: GraphNode[];
    public cycle: Graph | null;
    public cycleInfo: CycleInfo | null;
    public cycleOffset: number;
    public buttonEdge: GraphNode | null;
    public pathLength: number;
    
    constructor(arrow: any, handler: ArrowHandler) {
        if (handler == null) {
            console.trace(arrow, handler);
        }
        this.arrow = arrow;
        this.handler = handler;
        this.back = [];
        this.edges = [];
        this.cycle = null;
        this.cycleInfo = null;
        this.cycleOffset = 0;
        this.buttonEdge = null;
        this.pathLength = -1;
        
        arrow.graph_node = this;
    }
}