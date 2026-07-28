import { GraphDLC } from '../core/GraphDLC';
import { PatchLoader } from '../core/PatchLoader';

export function InjectGraphDLCv3() {
    const patchLoader = new PatchLoader();
    patchLoader.hook();
    const graphDLC = new GraphDLC(patchLoader);
    graphDLC.setup();

    window.graphdlc = graphDLC;
}
