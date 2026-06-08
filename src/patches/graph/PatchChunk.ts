import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { Chunk } from 'webpack';

interface PrivateChunk {
    readonly arrows: Arrow[];
}

export function PatchChunk(patchLoader: PatchLoader, graphDLC: GraphDLC) {
    patchLoader.addDefinitionPatch('Chunk', (_module: typeof Chunk) => {
        return class Chunk extends _module {
            public graphAstIndex: number | null = null;

            public getArrows(): readonly Arrow[] {
                const _this = this as any as PrivateChunk;
                return _this.arrows;
            }
        };
    });
}
