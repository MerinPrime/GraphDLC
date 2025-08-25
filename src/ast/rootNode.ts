import {ASTNode} from "./astNode";
import {CycleData} from "./cycle/cycleData";

export class RootNode extends ASTNode {
    cycles: CycleData[] = [];
}