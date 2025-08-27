import {GraphNode} from "./graph_node";
import {CycleHeadType} from "../ast/cycle/cycleHeadType";

export class Cycle {
    entryPoints: GraphNode[];
    activeEntryPoints: Set<GraphNode>;
    
    constructor(cycleSize: number, entryPoints: GraphNode[]) {
        this.entryPoints = entryPoints;
        this.activeEntryPoints = new Set<GraphNode>();
    }
    
    updateHead(position: number, headType: CycleHeadType) {
        switch (headType) {
            case CycleHeadType.WRITE:
                break;
            case CycleHeadType.XOR_WRITE:
            case CycleHeadType.READ:
                break;
            case CycleHeadType.CLEAR:
                break;
        }
    }
    
    update(tick: number): boolean {
        if (this.activeEntryPoints.size === 0) {
            return false;
        }
        // this.activeEntryPoints.forEach((entryPoint: GraphNode) => {
            // this.updateHead(tick + entryPoint.cycleOffset, entryPoint.cycleHeadType);
        // });
        return true;
    }
}
