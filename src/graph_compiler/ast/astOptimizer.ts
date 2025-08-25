import {ASTNode} from "./astNode";
import {CycleOptimizer} from "./cycle/cycleOptimizer";
import {Settings} from "../../core/settings";
import {RootNode} from "./rootNode";
import {BranchOptimizer} from "./branch/branchOptimizer";
import {SimpleOptimizer} from "./simple/simpleOptimizer";

export class ASTOptimizer {
    settings: Settings;
    cycleOptimizer: CycleOptimizer;
    branchOptimizer: BranchOptimizer;
    simpleOptimizer: SimpleOptimizer;
    
    constructor(settings: Settings) {
        this.settings = settings;
        this.cycleOptimizer = new CycleOptimizer();
        this.branchOptimizer = new BranchOptimizer();
        this.simpleOptimizer = new SimpleOptimizer();
    }
    
    applyOptimizations(rootNode: RootNode) {
        if (this.settings.data.optimizeSimple)
            this.simpleOptimizer.optimizeSimple(rootNode);
        // if (this.settings.data.optimizeRings)
        //     this.cycleOptimizer.optimizeCycles(rootNode);
        if (this.settings.data.optimizeBranches)
            this.branchOptimizer.optimizeBranches(rootNode);
    }
}