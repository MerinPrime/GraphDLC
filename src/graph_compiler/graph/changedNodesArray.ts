export class ChangedNodesArray {
    arr: Uint32Array;
    count: number;
    
    constructor(capacity: number) {
        this.arr = new Uint32Array(capacity);
        this.count = 0;
    }
    
    reserve(capacity: number) {
        if (this.arr.length > capacity) {
            return;
        }
        const newArr = new Uint32Array(capacity);
        newArr.set(this.arr);
        this.arr = newArr;
    }
    
    add(value: number) {
        if (this.count >= this.arr.length) {
            const newArr = new Uint32Array(this.arr.length * 2);
            newArr.set(this.arr);
            this.arr = newArr;
        }
        this.arr[this.count++] = value;
    }

    remove(index: number) {
        this.arr[index] = this.arr[this.count - 1];
        this.count--;
    }
}
