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
import {RootNode} from "../graph_compiler/ast/rootNode";
import {GraphCompiler} from "../graph_compiler/graph/graphCompiler";
import {GraphState} from "../graph_compiler/graph/graphState";
import {GraphUpdater} from "../graph_compiler/graph/graphUpdater";
import {Game} from "../api/game";

export class LayersDLC {
    patchLoader: PatchLoader;
    settings: Settings;
    tpsInfo: ITPSInfo | undefined;
    
    astParser: ASTParser;
    astOptimizer: ASTOptimizer;
    astDebugger: ASTDebugger;
    graphCompiler: GraphCompiler;
    graphUpdater: GraphUpdater;
    
    graph: Graph | undefined;
    gameMap: GameMap | undefined;
    game: Game | undefined;
    
    rootNode: RootNode | undefined;
    graphState: GraphState | undefined;

    constructor(patchLoader: PatchLoader) {
        this.patchLoader = patchLoader;
        this.settings = new Settings();
        this.tpsInfo = undefined;
        
        this.astParser = new ASTParser(patchLoader);
        this.astOptimizer = new ASTOptimizer(this.settings);
        this.astDebugger = new ASTDebugger();
        this.graphCompiler = new GraphCompiler();
        this.graphUpdater = new GraphUpdater();
        
        this.graph = undefined;
        this.gameMap = undefined;
        this.game = undefined;
        
        this.rootNode = undefined;
        this.graphState = undefined;
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
        if (!this.graphState || !this.gameMap) {
            return;
        }
        this.gameMap.chunks.forEach((chunk: Chunk) => {
            chunk.arrows.forEach((arrow: Arrow) => {
                arrow.signalsCount = 0;
                arrow.astIndex = undefined;
            });
        });
        this.graph = undefined;
        this.graphState = undefined;
    }

    compileGraph() {
        if (!this.gameMap) {
            alert('ERROR LayersDLC.gameMap is undefined ( try restart page ).');
            return;
        } else if (this.graphState) {
            alert('Map is already compiled!');
            return;
        }
        try {
            const debugMode = this.settings.data.debugMode - 1;
            const rootNode = this.astParser.compileFrom(this.gameMap);
            if (debugMode !== 2)
                this.astOptimizer.applyOptimizations(rootNode);
            
            this.rootNode = rootNode;
            if (debugMode !== -1) {
                this.astDebugger.showDebugSignals(rootNode, this.settings.data.debugMode - 1, this.gameMap);
                return;
            }
            
            const graphState = this.graphCompiler.compile(rootNode);
            this.graphUpdater.resetGraph(graphState);
            this.graphState = graphState;
        } catch (e: any) {
            alert(`ERROR ${e.message}`);
            console.error(e);
        }
    }
}

