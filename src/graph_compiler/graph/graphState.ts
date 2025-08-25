import {ChangedNodesArray} from "./changedNodesArray";

export class GraphState {
    entryPoints: Uint32Array;
    
    changedNodes: ChangedNodesArray;
    tempChangedNodes: ChangedNodesArray;
    delayedChangedNodes: ChangedNodesArray;

    flags: Uint8Array; // IS ENTRYPOINT | IS ADDITIONAL UPDATE | IS CYCLE HEAD | IS UPDATED
    types: Uint8Array;
    lastSignals: Uint8Array;
    signalsCount: Uint8Array;
    blockedCount: Uint8Array;
    signals: Uint8Array;
    edgesPosition: Uint32Array;
    edgesCount: Uint8Array;
    detectorsCount: Uint8Array;
    edges: Uint32Array;
    
    // Cycle data
    cycleHeadTypes: Uint8Array;
    nodeToCycleID: Int32Array;
    cycleOffsets: Uint8Array;
    
    cycleLengths: Uint8Array;
    cycleStates: Uint32Array;
    
    constructor(totalEntryPointCount: number, nodeCount: number, totalEdgesCount: number, cyclesCount: number) {
        this.entryPoints = new Uint32Array(totalEntryPointCount);
        
        this.changedNodes = new ChangedNodesArray(totalEntryPointCount);
        this.tempChangedNodes = new ChangedNodesArray(totalEntryPointCount);
        this.delayedChangedNodes = new ChangedNodesArray(64);
        
        this.flags = new Uint8Array(nodeCount);
        this.lastSignals = new Uint8Array(nodeCount);
        this.signalsCount = new Uint8Array(nodeCount);
        this.blockedCount = new Uint8Array(nodeCount);
        this.signals = new Uint8Array(nodeCount);
        this.types = new Uint8Array(nodeCount);
        this.edgesPosition = new Uint32Array(nodeCount);
        this.edgesCount = new Uint8Array(nodeCount);
        this.detectorsCount = new Uint8Array(nodeCount);
        this.edges = new Uint32Array(totalEdgesCount);
        
        this.cycleHeadTypes = new Uint8Array(nodeCount);
        this.nodeToCycleID = new Int32Array(nodeCount).fill(-1);
        this.cycleOffsets = new Uint8Array(nodeCount);
        
        this.cycleLengths = new Uint8Array(cyclesCount);
        this.cycleStates = new Uint32Array(cyclesCount);
    }
}
