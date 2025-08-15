import {GraphNode} from "./graph_node";
import {BitCycle} from "./bitarray";
import {CycleHeadType} from "./cycle_head_type";

export class Cycle {
    data: BitCycle;
    entryPoints: GraphNode[];
    activeEntryPoints: Set<GraphNode>;
    
    constructor(cycleSize: number, entryPoints: GraphNode[]) {
        this.data = new BitCycle(cycleSize);
        this.entryPoints = entryPoints;
        this.activeEntryPoints = new Set<GraphNode>();
    }
    
    updateHead(position: number, headType: CycleHeadType) {
        switch (headType) {
            case CycleHeadType.WRITE:
                this.data.write(position);
                break;
            case CycleHeadType.XOR_WRITE:
                this.data.xor_write(position);
                break;
            case CycleHeadType.READ:
                alert('BRUH ERROR')
                break;
            case CycleHeadType.CLEAR:
                this.data.clear(position);
                break;
        }
    }
    
    update(tick: number): boolean {
        if (this.activeEntryPoints.size === 0) {
            return false;
        }
        this.activeEntryPoints.forEach((entryPoint: GraphNode) => {
            this.updateHead(tick + entryPoint.cycleOffset, entryPoint.cycleHeadType);
        });
        return true;
    }
}
