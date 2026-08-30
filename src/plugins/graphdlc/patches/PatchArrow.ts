import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

export const PatchArrow: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('Arrow', (_module: typeof Arrow) => {
        return class Arrow extends _module {
            public astIndex: number | null = null;
        };
    });
};
