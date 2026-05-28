import { Arrow } from "../api/arrow";
import {ASTNode} from "./astNode";
import {CycleData} from "./cycle/cycleData";

export class RootNode extends ASTNode {
    cycles: CycleData[] = [];
    astNodes: Map<Arrow, ASTNode> = new Map();
}
