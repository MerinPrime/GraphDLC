import type { RawGraph } from '../RawGraph';
import type { RawNode } from '../RawNode';
import { ACTIVE_SIGNALS } from './ArrowSignals';
import { NodeSignal } from './NodeSignal';

export class RawNodeState {
    private _signal: number = 0;
    public get signal(): number {
        return this._signal;
    }
    public set signal(value: number) {
        if (value === NodeSignal.ACTIVE)
            this.node.arrow.signal = ACTIVE_SIGNALS[this.node.arrow.type];
        else this.node.arrow.signal = 0;
        this._signal = value;
    }
    lastSignal: number = 0;
    signalsCount: number = 0;
    prevCycleActive: boolean = false;
    cycleActive: boolean = false;
    blockedCount: number = 0;
    nodeInCycleOffset: number = 0;

    isEntryPoint: boolean = false;
    isAdditionalUpdate: boolean = false;
    isUpdated: boolean = false;
    isChanged: boolean = false;

    constructor(public node: RawNode) {}
}

export class RawCycleState {
    length: number;
    state: Uint32Array;

    constructor(length: number) {
        this.length = length;
        this.state = new Uint32Array(Math.ceil(length / 32));
    }
}

export class RawGraphState {
    changedNodes: RawNodeState[];
    tempChangedNodes: RawNodeState[];

    nodes: RawNodeState[];
    cycles: (RawCycleState | null)[];
    tick: number;

    constructor() {
        this.changedNodes = [];
        this.tempChangedNodes = [];

        this.nodes = [];
        this.cycles = [];
        this.tick = 0;
    }

    reset(graph: RawGraph) {
        this.tick = 0;
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

        this.cycles.forEach((cycle) => {
            if (cycle) cycle.state.fill(0);
        });
    }

    update(graph: RawGraph) {
        for (let i = this.nodes.length; i < graph.nodes.length; i++) {
            const nodeState = new RawNodeState(graph.nodes[i]);
            nodeState.nodeInCycleOffset = graph.nodes[i].cycleOffset;
            this.nodes.push(nodeState);
        }

        for (let i = 0; i < graph.cycles.length; i++) {
            const cycle = graph.cycles[i];
            if (cycle) {
                if (!this.cycles[i]) {
                    this.cycles[i] = new RawCycleState(cycle.nodes.length);
                    // Sync cycleOffset for all nodes and heads in the new cycle
                    for (const node of cycle.nodes) {
                        this.nodes[node.index].nodeInCycleOffset =
                            node.cycleOffset;
                    }
                    for (const head of cycle.heads) {
                        this.nodes[head.index].nodeInCycleOffset =
                            head.cycleOffset;
                    }
                }
            } else {
                this.cycles[i] = null;
            }
        }
    }
}
