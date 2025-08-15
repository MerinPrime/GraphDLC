export class BitCycle {
    length: number;
    data: Uint32Array;

    constructor(bitLength: number) {
        this.length = bitLength;
        const wordCount = Math.ceil(bitLength / 32);
        this.data = new Uint32Array(wordCount);
    }

    write(position: number): void {
        position = position % this.length;
        const offset = position % 32;
        const wordIndex = (position - offset) / 32;

        const mask = 1 << offset;
        this.data[wordIndex] |= mask;
    }

    clear(position: number): void {
        position = position % this.length;
        const offset = position % 32;
        const wordIndex = (position - offset) / 32;

        const mask = 1 << offset;
        this.data[wordIndex] &= ~mask;
    }

    xor_write(position: number): void {
        position = position % this.length;
        const offset = position % 32;
        const wordIndex = (position - offset) / 32;

        const mask = 1 << offset;
        this.data[wordIndex] ^= mask;
    }

    read(position: number): boolean {
        position = position % this.length;
        const offset = position % 32;
        const wordIndex = (position - offset) / 32;

        const mask = 1 << offset;
        return (this.data[wordIndex] & mask) != 0;
    }
}
