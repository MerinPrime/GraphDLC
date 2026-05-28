import { GraphDLC } from "./core/GraphDLC";
import { PatchLoader } from "./core/PatchLoader";

const patchLoader = new PatchLoader();
patchLoader.hook();
const graphDLC = new GraphDLC(patchLoader);
graphDLC.inject();

declare global {
    interface Window {
        graphdlc: GraphDLC;
    }
}

window.graphdlc = graphDLC;
