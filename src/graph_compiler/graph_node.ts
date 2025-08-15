import {ADDITIONAL_UPDATE_ARROWS, ArrowHandler, ENTRY_POINTS} from "./handlers";
import {Arrow} from "../api/arrow";
import {Graph} from "./graph";
import {CycleInfo} from "./compiled_map_graph";
import {ArrowType} from "../api/arrow_type";
import {Cycle} from "./cycle";
import {CycleHeadType} from "./cycle_head_type";

export class GraphNode {
    public arrow: Arrow;
    public handler?: ArrowHandler;
    public back: GraphNode[];
    public edges: GraphNode[];
    public newCycle: Cycle | null;
    public cycleOffset: number;
    public cycleHeadType: CycleHeadType;
    public buttonEdge: GraphNode | null;
    public pathLength: number;
    
    public isDelay: boolean = false;
    public isBlocker: boolean = false;
    public isDetector: boolean = false;
    public isBruh: boolean = false;
    public isButton: boolean = false;
    public isAdditionalUpdate: boolean = false;
    public isEntryPoint: boolean = false;
    
    constructor(arrow: any, handler: ArrowHandler) {
        if (handler == null) {
            console.trace(arrow, handler);
        }
        this.arrow = arrow;
        this.handler = handler;
        this.back = [];
        this.edges = [];
        this.newCycle = null;
        this.cycleOffset = 0;
        this.cycleHeadType = CycleHeadType.WRITE;
        this.buttonEdge = null;
        this.pathLength = -1;
        
        arrow.graph_node = this;
    }
    
    update() {
        this.isDelay = this.arrow.type === ArrowType.DELAY;
        this.isBlocker = this.arrow.type === ArrowType.BLOCKER;
        this.isDetector = this.arrow.type === ArrowType.DETECTOR;
        this.isBruh = this.arrow.type === ArrowType.RANDOM || (this.arrow.type === ArrowType.LOGIC_AND && this.newCycle !== null);
        this.isButton = this.arrow.type === ArrowType.BUTTON || this.arrow.type === ArrowType.BRUH_BUTTON;
        this.isAdditionalUpdate = ADDITIONAL_UPDATE_ARROWS.has(this.arrow.type);
        this.isEntryPoint = ENTRY_POINTS.has(this.arrow.type);
    }
}