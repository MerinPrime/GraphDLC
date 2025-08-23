import { PatchGame } from "../patches/game_patch";
import { PatchPlayerUI } from "../patches/playerui_patch";
import { PatchTPSInfo, ITPSInfo } from "../patches/tpsinfo_patch";
import { PatchLoader } from "./patchLoader";
import { Settings } from "./settings";
import {Graph} from "../graph_compiler/graph";
import {PatchPlayerControls} from "../patches/playercontrols_patch";
import {PatchGameMap} from "../patches/gamemap_patch";
import {Chunk} from "../api/chunk";
import {Arrow} from "../api/arrow";
import {GameMap} from "../api/game_map";
import {PatchChunkUpdates} from "../patches/chunkupdates_patch";
import {ASTParser} from "../graph_compiler/ast/astParser";
import {PatchGameText} from "../patches/gametext_patch";
import {PatchSettingsPage} from "../patches/settingspage_patch";
import {ASTOptimizer} from "../graph_compiler/ast/astOptimizer";
import {ASTDebugger} from "./astDebugger";
import {CompiledMapGraph} from "../graph_compiler/compiled_map_graph";

export class LayersDLC {
    patchLoader: PatchLoader;
    settings: Settings;
    tpsInfo: ITPSInfo | undefined;
    graph: Graph | undefined;
    gameMap: GameMap | undefined;
    astParser: ASTParser;
    astOptimizer: ASTOptimizer;
    astDebugger: ASTDebugger;

    constructor(patchLoader: PatchLoader) {
        this.patchLoader = patchLoader;
        this.settings = new Settings();
        this.tpsInfo = undefined;
        this.graph = undefined;
        this.gameMap = undefined;
        this.astParser = new ASTParser(patchLoader);
        this.astOptimizer = new ASTOptimizer(this.settings);
        this.astDebugger = new ASTDebugger();
    }

    inject() {
        PatchGame(this);
        PatchGameMap(this);
        PatchPlayerControls(this);
        PatchPlayerUI(this);
        PatchTPSInfo(this);
        PatchChunkUpdates(this);
        PatchGameText(this);
        PatchSettingsPage(this);
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
        if (this.graph || !this.gameMap) {
            return;
        }
        // const mapGraph = new CompiledMapGraph();
        // const kostyli = mapGraph.compile_from(this.gameMap);
        const debugMode = this.settings.data.debugMode - 1;
        const rootNode = this.astParser.compileFrom(this.gameMap);
        if (debugMode !== 2)
            this.astOptimizer.applyOptimizations(rootNode);
        if (debugMode !== -1)
            this.astDebugger.showDebugSignals(rootNode, this.settings.data.debugMode - 1, this.gameMap);
    }
}

