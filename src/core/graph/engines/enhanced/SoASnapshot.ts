export class SoANodeSnapshot {
    public nodeIdx: number = 0;

    public signal: number = 0;
    public lastSignal: number = 0;
    public signalsCount: number = 0;
    public blockedCount: number = 0;
}

export class SoACycleSnapshot {
    public readonly cycleIdx: number;
    public readonly length: number;
    public readonly state: Uint32Array;

    public constructor(cycleIdx: number, length: number) {
        this.cycleIdx = cycleIdx;
        this.length = length;
        this.state = new Uint32Array(Math.ceil(length / 32));
    }
}

export class SoASnapshot {
    public tick: number = 0;
    public breakPoint: boolean = false;

    public nodes: SoANodeSnapshot[] = [];
    public chunks: number[] = [];

    public changedNodes: number[] = [];
    public tempChangedNodes: number[] = [];
    public cycles: SoACycleSnapshot[] = [];
}

// TODO: store random arrow states
