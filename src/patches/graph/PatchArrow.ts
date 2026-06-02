import { Arrow } from '@logic-arrows/game-logic/arrow';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';

export function PatchArrow(patchLoader: PatchLoader, graphDLC: GraphDLC) {
    patchLoader.addDefinitionPatch('Arrow', (_module: typeof Arrow) => {
        return class Arrow extends _module {
            public graphAstIndex: number | null = null;
        };
    });
}
