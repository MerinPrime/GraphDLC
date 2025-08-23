import {ASTNode} from "./astNode";
import {CycleOptimizer} from "./cycle/cycleOptimizer";
import {Settings} from "../../core/settings";
import {RootNode} from "./rootNode";
import {BranchOptimizer} from "./branch/branchOptimizer";

export class ASTOptimizer {
    settings: Settings;
    cycleOptimizer: CycleOptimizer;
    branchOptimizer: BranchOptimizer;
    
    constructor(settings: Settings) {
        this.settings = settings;
        this.cycleOptimizer = new CycleOptimizer();
        this.branchOptimizer = new BranchOptimizer();
    }
    
    applyOptimizations(rootNode: RootNode) {
        if (this.settings.data.optimizeRings)
            this.cycleOptimizer.optimizeCycles(rootNode);
        if (this.settings.data.optimizeBranches)
            this.branchOptimizer.optimizeBranches(rootNode);
    }
}