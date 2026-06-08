import type { RawGraph } from '../RawGraph';
import type { RawNode } from '../RawNode';

export class RawNodeState {
    signal: number = 0;
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

export class RawChunkState {
    isDirty: boolean = false;

    constructor(readonly chunkIdx: number = 0) {}
}

export class RawGraphState {
    changedNodes: RawNodeState[];
    tempChangedNodes: RawNodeState[];

    nodes: RawNodeState[];
    chunks: RawChunkState[];

    cycles: (RawCycleState | null)[];
    tick: number;

    constructor() {
        this.changedNodes = [];
        this.tempChangedNodes = [];

        this.nodes = [];
        this.chunks = [];

        this.cycles = [];
        this.tick = 0;
    }

    reset(graph: RawGraph) {
        this.update(graph);

        this.tick = 0;
        this.changedNodes.length = 0;
        graph.entryPoints.forEach((entryPoint) => {
            this.changedNodes.push(this.nodes[entryPoint.index]);
        });
        this.tempChangedNodes.length = 0;
        this.nodes.forEach((node) => {
            node.signal = 0;
            node.lastSignal = 0;
            node.signalsCount = 0;
            node.blockedCount = 0;
            node.isUpdated = false;
            node.isChanged = false;
        });
        this.chunks.forEach((chunk) => {
            chunk.isDirty = true;
        });

        this.cycles.forEach((cycle) => {
            if (cycle) cycle.state.fill(0);
        });
    }

    makeDirtyNodeChunk(node: RawNode) {
        this.chunks[node.chunkIdx].isDirty = true;
    }

    getDirtyChunks(): [...chunkIdx: number[]] {
        const dirtyChunks: number[] = [];
        this.chunks.forEach((chunk) => {
            if (chunk.isDirty) {
                chunk.isDirty = false;
                dirtyChunks.push(chunk.chunkIdx);
            }
        });
        return dirtyChunks;
    }

    update(graph: RawGraph) {
        for (let i = this.nodes.length; i < graph.nodes.length; i++) {
            const nodeState = new RawNodeState(graph.nodes[i]);
            nodeState.nodeInCycleOffset = graph.nodes[i].cycleOffset;
            this.nodes.push(nodeState);
        }

        const chunks = graph.getAllChunks();
        for (let i = this.chunks.length; i < chunks.length; i++) {
            const chunkState = new RawChunkState(i);
            this.chunks.push(chunkState);
        }

        for (let i = 0; i < graph.cycles.length; i++) {
            const cycle = graph.cycles[i];
            if (cycle) {
                if (!this.cycles[i]) {
                    this.cycles[i] = new RawCycleState(cycle.nodes.length);
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
