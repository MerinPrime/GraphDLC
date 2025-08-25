import {ArrowType} from "../../api/arrowType";

export class ASTNodeType {
    public readonly index: number;
    private static _values: ASTNodeType[] = [];
    
    constructor(
        public readonly isEntryPoint: boolean,
        public readonly isAdditionalUpdate: boolean,
        public readonly isLogic: boolean,
    ) {
        this.index = ASTNodeType._values.length;
        ASTNodeType._values.push(this);
    }
    
    static readonly PATH = new ASTNodeType(false, false, false);
    static readonly SOURCE = new ASTNodeType(true, false, false);
    static readonly BLOCKER = new ASTNodeType(false, false, false);
    static readonly DELAY = new ASTNodeType(false, true, false);
    static readonly DETECTOR = new ASTNodeType(false, false, false);
    static readonly IMPULSE = new ASTNodeType(true, true, false);
    static readonly LOGIC_NOT = new ASTNodeType(true, false, true);
    static readonly LOGIC_AND = new ASTNodeType(false, false, true);
    static readonly LOGIC_XOR = new ASTNodeType(false, false, true);
    static readonly LATCH = new ASTNodeType(false, false, true);
    static readonly FLIP_FLOP = new ASTNodeType(false, true, true);
    static readonly RANDOM = new ASTNodeType(false, true, false);
    static readonly BUTTON = new ASTNodeType(true, false, false);
    static readonly DIRECTIONAL_BUTTON = new ASTNodeType(true, false, false);
    static readonly CYCLE_HEAD = new ASTNodeType(false, false, false);
    
    // TODO: COMPRESS TO 4 BITS
    
    static values(): ASTNodeType[] {
        return [...ASTNodeType._values];
    }
    
    static fromIndex(index: number): ASTNodeType | undefined {
        return ASTNodeType._values[index];
    }
}

export const PathTypeIndex = ASTNodeType.PATH.index;
export const SourceTypeIndex = ASTNodeType.SOURCE.index;
export const BlockerTypeIndex = ASTNodeType.BLOCKER.index;
export const DelayTypeIndex = ASTNodeType.DELAY.index;
export const DetectorTypeIndex = ASTNodeType.DETECTOR.index;
export const ImpulseTypeIndex = ASTNodeType.IMPULSE.index;
export const NOTTypeIndex = ASTNodeType.LOGIC_NOT.index;
export const ANDTypeIndex = ASTNodeType.LOGIC_AND.index;
export const XORTypeIndex = ASTNodeType.LOGIC_XOR.index;
export const LatchTypeIndex = ASTNodeType.LATCH.index;
export const FlipFlopTypeIndex = ASTNodeType.FLIP_FLOP.index;
export const RandomTypeIndex = ASTNodeType.RANDOM.index;
export const ButtonTypeIndex = ASTNodeType.BUTTON.index;
export const DirectionalButtonTypeIndex = ASTNodeType.DIRECTIONAL_BUTTON.index;

export function getASTType(arrowType: ArrowType): ASTNodeType {
    switch (arrowType) {
        case ArrowType.ARROW:
        case ArrowType.SPLITTER_UP_DOWN:
        case ArrowType.SPLITTER_UP_RIGHT:
        case ArrowType.SPLITTER_UP_RIGHT_LEFT:
        case ArrowType.BLUE_ARROW:
        case ArrowType.DIAGONAL_ARROW:
        case ArrowType.SPLITTER_UP_UP:
        case ArrowType.SPLITTER_RIGHT_UP:
        case ArrowType.SPLITTER_UP_DIAGONAL:
            return ASTNodeType.PATH;
        case ArrowType.SOURCE:
            return ASTNodeType.SOURCE;
        case ArrowType.BLOCKER:
            return ASTNodeType.BLOCKER;
        case ArrowType.DELAY:
            return ASTNodeType.DELAY;
        case ArrowType.DETECTOR:
            return ASTNodeType.DETECTOR;
        case ArrowType.IMPULSE:
            return ASTNodeType.IMPULSE;
        case ArrowType.LOGIC_NOT:
            return ASTNodeType.LOGIC_NOT;
        case ArrowType.LOGIC_AND:
            return ASTNodeType.LOGIC_AND;
        case ArrowType.LOGIC_XOR:
            return ASTNodeType.LOGIC_XOR;
        case ArrowType.LATCH:
            return ASTNodeType.LATCH;
        case ArrowType.FLIP_FLOP:
            return ASTNodeType.FLIP_FLOP;
        case ArrowType.RANDOM:
            return ASTNodeType.RANDOM;
        case ArrowType.BUTTON:
            return ASTNodeType.BUTTON;
        case ArrowType.DIRECTIONAL_BUTTON:
            return ASTNodeType.DIRECTIONAL_BUTTON;
        case ArrowType.EMPTY:
        case ArrowType.LEVEL_SOURCE:
        case ArrowType.LEVEL_TARGET:
        default:
            throw new Error('How did you compile level arrow if its cant be compiled?');
    }
}
