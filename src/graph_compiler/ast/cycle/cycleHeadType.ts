import {ArrowType} from "../../../api/arrowType";
import {ASTNodeType} from "../astNodeType";

export enum CycleHeadType {
    WRITE = 0,
    XOR_WRITE = 1,
    READ = 2,
    CLEAR = 3,
}

export function getCycleHeadType(backType: ASTNodeType, currentType: ASTNodeType): CycleHeadType | undefined {
    if (backType === ASTNodeType.BLOCKER) {
        if (currentType === ASTNodeType.PATH)
            return CycleHeadType.CLEAR;
        else
            return undefined;
    }
    switch (currentType) {
        case ASTNodeType.LOGIC_XOR:
            return CycleHeadType.XOR_WRITE;
        case ASTNodeType.LOGIC_AND:
            return CycleHeadType.READ;
        case ASTNodeType.PATH:
            return CycleHeadType.WRITE;
        default:
            return undefined;
    }
}
