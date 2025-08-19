import {PatchLoader} from "./core/patchloader";
import { LayersDLC } from "./core/layersdlc";

const patchLoader = new PatchLoader();
patchLoader.hook();
const layersdlc = new LayersDLC(patchLoader);
layersdlc.inject();
