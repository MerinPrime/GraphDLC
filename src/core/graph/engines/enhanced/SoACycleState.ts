export class SoACycleState {
    public readonly cycleIdx: number;
    public readonly length: number;
    public readonly state: Uint32Array;

    public constructor(cycleIdx: number, length: number) {
        this.cycleIdx = cycleIdx;
        this.length = length;
        this.state = new Uint32Array(Math.ceil(length / 32));
    }

    public clear() {
        this.state.fill(0);
    }

    private getBitPos(
        tick: number,
        offset: number,
    ): { word: number; mask: number } {
        const pos = (tick + offset) % this.length;
        return {
            word: pos >> 5,
            mask: 1 << (pos & 31),
        };
    }

    public getBit(tick: number, offset: number): boolean {
        const { word, mask } = this.getBitPos(tick, offset);
        return (this.state[word] & mask) !== 0;
    }

    public writeBit(tick: number, offset: number) {
        const { word, mask } = this.getBitPos(tick, offset);
        this.state[word] |= mask;
    }

    public clearBit(tick: number, offset: number) {
        const { word, mask } = this.getBitPos(tick, offset);
        this.state[word] &= ~mask;
    }

    public xorBit(tick: number, offset: number) {
        const { word, mask } = this.getBitPos(tick, offset);
        this.state[word] ^= mask;
    }
}
