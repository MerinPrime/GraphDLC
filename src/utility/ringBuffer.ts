import {toPowerOfTwo} from "./toPowerOfTwo";

export class RingBuffer<T> {
    private buffer: (T | undefined)[];
    private head: number;
    private tail: number;
    private _size: number;
    private capacity: number;
    
    constructor(initialCapacity: number = 16) {
        this.buffer = new Array(initialCapacity);
        this.head = 0;
        this.tail = 0;
        this._size = 0;
        this.capacity = initialCapacity;
    }
    
    get size(): number {
        return this._size;
    }
    
    private expand(minimum: number = this.capacity + 1) {
        const newCapacity = toPowerOfTwo(minimum);
        const newBuffer = new Array<T | undefined>(newCapacity);

        for (let i = 0; i < this._size; i++) {
            newBuffer[i] = this.buffer[(this.head + i) % this.capacity];
        }

        this.buffer = newBuffer;
        this.capacity = newCapacity;
        this.head = 0;
        this.tail = this._size;
    }
    
    push(value: T) {
        if (this._size === this.capacity) {
            this.expand();
        }

        this.buffer[this.tail] = value;
        this.tail = (this.tail + 1) % this.capacity;
        this._size++;
    }
    
    multiPush(values: T[]) {
        if ((this._size + values.length - 1) >= this.capacity) {
            this.expand(this._size + values.length);
        }

        for (let i = 0; i < values.length; i++) {
            this.buffer[this.tail] = values[i];
            this.tail = (this.tail + 1) % this.capacity;
        }
        this._size += values.length;
    }
    
    pop(): T | undefined {
        if (this._size === 0) return undefined;

        const value = this.buffer[this.head];
        this.buffer[this.head] = undefined;
        this.head = (this.head + 1) % this.capacity;
        this._size--;

        return value;
    }

    toArray(): T[] {
        const result: T[] = [];
        for (let i = 0; i < this._size; i++) {
            result.push(this.buffer[(this.head + i) % this.capacity]!);
        }
        return result;
    }
}