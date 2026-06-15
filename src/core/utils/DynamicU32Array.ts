export class DynamicU32Array {
    private data: Uint32Array;
    private size: number;

    public constructor(initialCapacity: number) {
        const capacity = Math.max(initialCapacity, 4);
        this.data = new Uint32Array(capacity);
        this.size = 0;
    }

    public get length(): number {
        return this.size;
    }

    public get capacity(): number {
        return this.data.length;
    }

    public get buffer(): Uint32Array {
        return this.data;
    }

    public reserve(requiredCapacity: number): void {
        if (this.data.length >= requiredCapacity) {
            return;
        }

        const newData = new Uint32Array(requiredCapacity);
        newData.set(this.data);
        this.data = newData;
    }

    public add(value: number): void {
        if (this.size >= this.data.length) {
            const nextCapacity = this.data.length * 2;
            const newData = new Uint32Array(nextCapacity);
            newData.set(this.data);
            this.data = newData;
        }
        this.data[this.size++] = value;
    }

    public remove(index: number): void {
        this.size--;
        this.data[index] = this.data[this.size];
    }

    public removeElement(value: number): void {
        for (let i = 0; i < this.size; i++) {
            if (this.data[i] === value) {
                this.remove(i--);
            }
        }
    }

    public clear(): void {
        this.size = 0;
    }
}
