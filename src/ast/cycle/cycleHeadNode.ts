import {ASTNode} from "../astNode";
import {CycleHeadType} from "./cycleHeadType";
import {CycleData} from "./cycleData";
import {ASTNodeType} from "../astNodeType";

export class CycleHeadNode extends ASTNode {
    cycleHeadType: CycleHeadType = CycleHeadType.WRITE;
    index: number = -1;
    cycleData: CycleData;
    type: ASTNodeType = ASTNodeType.CYCLE_HEAD;
    
    constructor(cycleData: CycleData) {
        super();
        this.cycleData = cycleData;
    }
}