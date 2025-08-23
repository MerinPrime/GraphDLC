import {ASTNode} from "../astNode";
import {CycleHeadType} from "./cycleHeadType";
import {CycleData} from "./cycleData";

export class CycleHeadNode extends ASTNode {
    cycleHeadType: CycleHeadType = CycleHeadType.WRITE;
    index: number = -1;
    cycleData: CycleData;
    
    constructor(cycleData: CycleData) {
        super();
        this.cycleData = cycleData;
    }
}