import type { RawGraph } from '../RawGraph';
import type { RawNode } from '../RawNode';

export class RawNodeState {
    public signal: number = 0;
    public lastSignal: number = 0;
    public signalsCount: number = 0;
    public blockedCount: number = 0;
    public nodeInCycleOffset: number = 0;

    public isEntryPoint: boolean = false;
    public isAdditionalUpdate: boolean = false;
    public isUpdated: boolean = false;
    public isChanged: boolean = false;

    public constructor(public node: RawNode) {}
}

export class RawCycleState {
    public length: number;
    public state: Uint32Array;

    public constructor(length: number) {
        this.length = length;
        this.state = new Uint32Array(Math.ceil(length / 32));
    }
}

export class RawChunkState {
    public isDirty: boolean = false;

    public constructor(public readonly chunkIdx: number = 0) {}
}

export class RawGraphState {
    public changedNodes: RawNodeState[];
    public tempChangedNodes: RawNodeState[];

    public nodes: RawNodeState[];
    public chunks: RawChunkState[];

    public cycles: (RawCycleState | null)[];
    public tick: number;
    public breakPoint: boolean = false;

    public constructor() {
        this.changedNodes = [];
        this.tempChangedNodes = [];

        this.nodes = [];
        this.chunks = [];

        this.cycles = [];
        this.tick = 0;
    }

    public reset(graph: RawGraph) {
        this.update(graph);

        this.tick = 0;
        this.changedNodes.length = 0;
        this.tempChangedNodes.length = 0;
        graph.entryPoints.forEach((entryPoint) => {
            this.changedNodes.push(this.nodes[entryPoint.nodeIdx]);
        });
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
        this.tick = 0;
    }

    public makeDirtyNodeChunk(node: RawNode) {
        this.chunks[node.chunkIdx].isDirty = true;
    }

    public getDirtyChunks(): [...chunkIdx: number[]] {
        const dirtyChunks: number[] = [];
        this.chunks.forEach((chunk) => {
            if (chunk.isDirty) {
                chunk.isDirty = false;
                dirtyChunks.push(chunk.chunkIdx);
            }
        });
        return dirtyChunks;
    }

    public update(graph: RawGraph) {
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
                        this.nodes[node.nodeIdx].nodeInCycleOffset =
                            node.cycleOffset;
                    }
                    for (const head of cycle.heads) {
                        this.nodes[head.nodeIdx].nodeInCycleOffset =
                            head.cycleOffset;
                    }
                }
            } else {
                this.cycles[i] = null;
            }
        }
    }
}
