import {ADDITIONAL_UPDATE_ARROWS, ArrowHandler, ENTRY_POINTS} from "./handlers";
import {Arrow} from "../api/arrow";
import {ArrowType} from "../api/arrowType";
import {CycleHeadType} from "./ast/cycle/cycleHeadType";

export class GraphNode {
    public arrow: Arrow;
    public handler?: ArrowHandler;
    public back: GraphNode[];
    public edges: GraphNode[];
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
        this.buttonEdge = null;
        this.pathLength = -1;
    }
    
    update() {
        this.isDelay = this.arrow.type === ArrowType.DELAY;
        this.isBlocker = this.arrow.type === ArrowType.BLOCKER;
        this.isDetector = this.arrow.type === ArrowType.DETECTOR;
        this.isBruh = this.arrow.type === ArrowType.RANDOM;
        this.isButton = this.arrow.type === ArrowType.BUTTON || this.arrow.type === ArrowType.DIRECTIONAL_BUTTON;
        this.isAdditionalUpdate = ADDITIONAL_UPDATE_ARROWS.has(this.arrow.type);
        this.isEntryPoint = ENTRY_POINTS.has(this.arrow.type);
    }
}