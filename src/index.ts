import {PatchLoader} from "./core/patchLoader";
import { LayersDLC } from "./core/layersDLC";

const patchLoader = new PatchLoader();
patchLoader.hook();
const layersdlc = new LayersDLC(patchLoader);
layersdlc.inject();
