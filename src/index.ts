import {PatchLoader} from "./core/patchLoader";
import { GraphDLC } from "./core/graphDLC";

const patchLoader = new PatchLoader();
patchLoader.hook();
const graphDLC = new GraphDLC(patchLoader);
graphDLC.inject();

// @ts-ignore
window.graphdlc = graphDLC;
