import type { PathStep } from 'src/core/path_finder/types';
import type { ArrowType } from 'src/core/utils/ArrowType';

export interface PathData {
    startPathX: number;
    startPathY: number;
    endPathX: number;
    endPathY: number;
    path: PathStep[];
    arrowType: ArrowType;
    rotation: number;
    flip: boolean;
}
