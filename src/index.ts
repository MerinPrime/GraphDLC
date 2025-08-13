import {PatchLoader} from "./loader/patchloader";
import {
    PatchChunkUpdates,
    PatchGame,
    PatchGameMap,
    PatchPlayerControls, PatchPlayerSettings,
    PatchPlayerUI, PatchTPSInfo
} from "./graph_compiler/chunk_updates_patch";

const patchLoader = new PatchLoader();
patchLoader.hook();
PatchChunkUpdates(patchLoader);
PatchPlayerUI(patchLoader);
PatchTPSInfo(patchLoader);
PatchGameMap(patchLoader);
PatchPlayerControls(patchLoader);
PatchGame(patchLoader);
PatchPlayerSettings(patchLoader);
