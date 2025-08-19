import { PatchGame } from "../patches/game_patch";
import { PatchPlayerUI } from "../patches/playerui_patch";
import { PatchTPSInfo, ITPSInfo } from "../patches/tpsinfo_patch";
import { PatchLoader } from "./patchloader";
import { Settings } from "./settings";
import {Graph} from "../graph_compiler/graph";
import {PatchPlayerControls} from "../patches/playercontrols_patch";
import {PatchGameMap} from "../patches/gamemap_patch";
import {CompiledMapGraph} from "../graph_compiler/compiled_map_graph";
import {Chunk} from "../api/chunk";
import {Arrow} from "../api/arrow";
import {GameMap} from "../api/game_map";
import {PatchChunkUpdates} from "../patches/chunkupdates_patch";

export class LayersDLC {
    settings: Settings;
    tpsInfo: ITPSInfo | undefined;
    graph: Graph | undefined;
    patchLoader: PatchLoader;
    gameMap: GameMap | undefined;

    constructor(patchLoader: PatchLoader) {
        this.settings = new Settings();
        this.tpsInfo = undefined;
        this.graph = undefined;
        this.patchLoader = patchLoader;
        this.gameMap = undefined;
    }

    inject() {
        PatchGame(this);
        PatchGameMap(this);
        PatchPlayerControls(this);
        PatchPlayerUI(this);
        PatchTPSInfo(this);
        PatchChunkUpdates(this);
    }

    invalidateGraph() {
        if (!this.graph || !this.gameMap) {
            return;
        }
        this.gameMap.chunks.forEach((chunk: Chunk) => {
            chunk.arrows.forEach((arrow: Arrow) => {
                arrow.signalsCount = 0;
            });
        });
        this.graph = undefined;
    }

    compileGraph() {
        console.log(this.gameMap);
        if (this.graph || !this.gameMap) {
            return;
        }
        const kostyli = new CompiledMapGraph();
        kostyli.compile_from(this.gameMap);
        this.graph = kostyli.graph;
    }
}

