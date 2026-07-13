import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

interface PrivateChunk {
    readonly arrows: Arrow[];
}

export const PatchChunk: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('Chunk', (_module: typeof Chunk) => {
        return class Chunk extends _module {
            public astIndex: number | null = null;

            public getArrows(): readonly Arrow[] {
                const _this = this as any as PrivateChunk;
                return _this.arrows;
            }
        };
    });
};
