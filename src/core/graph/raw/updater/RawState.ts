import type { RawGraph } from '../RawGraph';
import type { RawNode } from '../RawNode';

export class RawNodeState {
    signal: number = 0;
    lastSignal: number = 0;
    signalsCount: number = 0;
    blockedCount: number = 0;

    isEntryPoint: boolean = false;
    isAdditionalUpdate: boolean = false;
    isUpdated: boolean = false;
    isChanged: boolean = false;

    constructor(public node: RawNode) {}
}

export class RawGraphState {
    changedNodes: RawNodeState[];
    tempChangedNodes: RawNodeState[];

    nodes: RawNodeState[];

    constructor() {
        this.changedNodes = [];
        this.tempChangedNodes = [];

        this.nodes = [];
    }

    reset(graph: RawGraph) {
        this.changedNodes.length = 0;
        graph.entryPoints.forEach((entryPoint) => {
            this.changedNodes.push(this.nodes[entryPoint.index]);
        });
        this.tempChangedNodes.length = 0;
        this.nodes.forEach((node) => {
            node.signal = 0;
            node.node.arrow.signal = 0;
            node.node.chunk.markRenderDirty();
            node.lastSignal = 0;
            node.signalsCount = 0;
            node.blockedCount = 0;
            node.isUpdated = false;
            node.isChanged = false;
        });
    }

    update(graph: RawGraph) {
        for (let i = this.nodes.length; i < graph.nodes.length; i++) {
            this.nodes.push(new RawNodeState(graph.nodes[i]));
        }
    }
}
