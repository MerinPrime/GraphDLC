import {ASTNode} from "../astNode";
import {Arrow} from "../../api/arrow";

export class CycleData {
    length: number;
    
    constructor(
        public cycle: Arrow[]
    ) {
        this.length = cycle.length;
    }
}