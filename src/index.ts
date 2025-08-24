import {PatchLoader} from "./core/patchLoader";
import { LayersDLC } from "./core/layersDLC";

const patchLoader = new PatchLoader();
patchLoader.hook();
const layersDLC = new LayersDLC(patchLoader);
layersDLC.inject();

// @ts-ignore
window.layersdlc = layersDLC;
