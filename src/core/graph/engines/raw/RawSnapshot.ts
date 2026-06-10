export class RawNodeSnapshot {
    public readonly nodeIdx: number = 0;

    public readonly signal: number = 0;
    public readonly lastSignal: number = 0;
    public readonly signalsCount: number = 0;
    public readonly blockedCount: number = 0;
}

export class RawCycleSnapshot {
    public readonly cycleIdx: number;
    public readonly length: number;
    public readonly state: Uint32Array;

    public constructor(cycleIdx: number, length: number) {
        this.cycleIdx = cycleIdx;
        this.length = length;
        this.state = new Uint32Array(Math.ceil(length / 32));
    }
}

export class RawSnapshot {
    public readonly tick: number = 0;
    public readonly breakPoint: boolean = false;

    public readonly nodes: RawNodeSnapshot[] = [];
    public readonly chunks: number[] = [];

    public readonly changedNodes: number[] = [];
    public readonly tempChangedNodes: number[] = [];
    public readonly cycles: RawCycleSnapshot[] = [];
}
