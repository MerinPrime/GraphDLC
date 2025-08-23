import {ASTNode} from "../astNode";
import {Arrow} from "../../../api/arrow";

export class CycleData {
    constructor(
        public cycle: Arrow[]
    ) { }
}