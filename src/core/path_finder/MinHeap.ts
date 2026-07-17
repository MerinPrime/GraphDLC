export class MinHeap {
    private data: number[] = [];
    private scores: number[] = [];

    public get size(): number {
        return this.data.length;
    }

    public get minScore(): number {
        return this.scores.length > 0 ? this.scores[0] : Infinity;
    }

    public clear() {
        this.data.length = 0;
        this.scores.length = 0;
    }

    public push(element: number, score: number): void {
        this.data.push(element);
        this.scores.push(score);
        this.up(this.data.length - 1);
    }

    public pop(): number | undefined {
        if (this.data.length === 0) {
            return undefined;
        }
        const result = this.data[0];
        const endElement = this.data.pop();
        const endScore = this.scores.pop();

        if (
            this.data.length > 0 &&
            endElement !== undefined &&
            endScore !== undefined
        ) {
            this.data[0] = endElement;
            this.scores[0] = endScore;
            this.down(0);
        }
        return result;
    }

    private up(n: number): void {
        const element = this.data[n];
        const score = this.scores[n];
        while (n > 0) {
            const parentN = (n - 1) >> 1;
            const parentScore = this.scores[parentN];
            if (score >= parentScore) {
                break;
            }
            this.data[n] = this.data[parentN];
            this.scores[n] = parentScore;
            n = parentN;
        }
        this.data[n] = element;
        this.scores[n] = score;
    }

    private down(n: number): void {
        const length = this.data.length;
        const element = this.data[n];
        const score = this.scores[n];

        while (true) {
            const child1N = (n << 1) + 1;
            const child2N = child1N + 1;
            let swap = -1;
            let minScore = score;

            if (child1N < length && this.scores[child1N] < minScore) {
                swap = child1N;
                minScore = this.scores[child1N];
            }
            if (child2N < length && this.scores[child2N] < minScore) {
                swap = child2N;
            }

            if (swap === -1) {
                break;
            }

            this.data[n] = this.data[swap];
            this.scores[n] = this.scores[swap];
            n = swap;
        }
        this.data[n] = element;
        this.scores[n] = score;
    }
}
