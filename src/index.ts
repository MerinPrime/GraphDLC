import { GraphDLC } from './core/GraphDLC';
import { PatchLoader } from './core/PatchLoader';

const patchLoader = new PatchLoader();
patchLoader.hook();
const graphDLC = new GraphDLC(patchLoader);
graphDLC.inject();

window.graphdlc = graphDLC;
