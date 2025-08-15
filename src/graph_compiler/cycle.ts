import {GraphNode} from "./graph_node";
import {BitCycle} from "./bitarray";
import {CycleHeadType} from "./cycle_head_type";

export class Cycle {
    data: BitCycle;
    entryPoints: GraphNode[];
    
    constructor(cycleSize: number, entryPoints: GraphNode[]) {
        this.data = new BitCycle(cycleSize);
        this.entryPoints = entryPoints;
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
        let anyActive = false;
        this.entryPoints.forEach((entryPoint: GraphNode) => {
            const isActive = entryPoint.arrow.signal === entryPoint.handler?.active_signal;
            if (isActive)
                this.updateHead(tick + entryPoint.cycleOffset, entryPoint.cycleHeadType);
            anyActive ||= isActive;
        });
        return anyActive;
    }
}