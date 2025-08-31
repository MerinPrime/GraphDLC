import {PatchGame} from "../patches/gamePatch";
import {PatchPlayerUI} from "../patches/playerUIPatch";
import {PatchLoader} from "./patchLoader";
import {Settings} from "./settings";
import {PatchPlayerControls} from "../patches/playerControlsPatch";
import {PatchGameMap} from "../patches/gameMapPatch";
import {Chunk} from "../api/chunk";
import {Arrow} from "../api/arrow";
import {GameMap} from "../api/gameMap";
import {PatchChunkUpdates} from "../patches/chunkUpdatesPatch";
import {ASTParser} from "../ast/astParser";
import {PatchGameText} from "../patches/gameTextPatch";
import {PatchSettingsPage} from "../patches/settingsPagePatch";
import {ASTOptimizer} from "../ast/astOptimizer";
import {ASTDebugger, DebugMode} from "../ast/astDebugger";
import {RootNode} from "../ast/rootNode";
import {GraphCompiler} from "../graph/graphCompiler";
import {GraphState} from "../graph/graphState";
import {GraphUpdater} from "../graph/graphUpdater";
import {Game} from "../api/game";
import {InfoContainerComponent} from "../patches/custom/infoContainerComponent";
import {CustomTPSComponent} from "../patches/custom/customTPSComponent";
import {CustomUI} from "../patches/custom/customUI";

export class GraphDLC {
    patchLoader: PatchLoader;
    settings: Settings;

    customUI: CustomUI;
    
    astParser: ASTParser;
    astOptimizer: ASTOptimizer;
    astDebugger: ASTDebugger;
    graphCompiler: GraphCompiler;
    graphUpdater: GraphUpdater;
    
    gameMap: GameMap | undefined;
    game: Game | undefined;
    
    rootNode: RootNode | undefined;
    graphState: GraphState | undefined;

    constructor(patchLoader: PatchLoader) {
        this.patchLoader = patchLoader;
        this.settings = new Settings();
        this.customUI = new CustomUI();
        
        this.astParser = new ASTParser(patchLoader);
        this.astOptimizer = new ASTOptimizer(this.settings);
        this.astDebugger = new ASTDebugger();
        this.graphCompiler = new GraphCompiler();
        this.graphUpdater = new GraphUpdater();
        
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
                arrow.astIndex = undefined;
            });
        });
        this.graphState = undefined;
    }

    compileGraph() {
        if (!this.gameMap) {
            alert('ERROR GraphDLC.gameMap is undefined ( try restart page ).');
            return;
        } else if (this.graphState) {
            // alert('Map is already compiled!');
            // return;
        }
        try {
            const debugMode = this.settings.data.debugMode;
            const rootNode = this.astParser.compileFrom(this.gameMap);
            
            if (debugMode !== DebugMode.DEAD_NODES)
                this.astOptimizer.applyOptimizations(rootNode);
            
            this.rootNode = rootNode;
            if (debugMode !== DebugMode.NONE) {
                this.astDebugger.showDebugSignals(debugMode, rootNode, this.gameMap);
                return;
            }
            
            const graphState = this.graphCompiler.compile(rootNode);
            this.graphUpdater.resetGraph(graphState);
            this.game!.tick = 0;
            this.graphState = graphState;
        } catch (e: any) {
            alert(`ERROR ${e.message}`);
            console.error(e);
        }
    }
}

