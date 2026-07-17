import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';

export type IPatcher = (patchLoader: PatchLoader, graphDLC: GraphDLC) => void;

export function ApplyPatches(
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
    patches: IPatcher[],
) {
    patches.forEach((patch) => {
        patch(patchLoader, graphDLC);
    });
}
