export class Bounds {
    public constructor(
        public readonly minX: number,
        public readonly minY: number,
        public readonly maxX: number,
        public readonly maxY: number,
    ) {}

    public InBounds(x: number, y: number): boolean {
        return (
            x >= this.minX && y >= this.minY && x <= this.maxX && y <= this.maxY
        );
    }
}
