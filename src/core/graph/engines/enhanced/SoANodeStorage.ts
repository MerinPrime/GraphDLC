import { SoALayout } from './SoALayout';

export class SoANodeStorage {
    public nodeData: Uint8Array;
    public extra8NodeData: Uint8Array;
    public extra32NodeData: Uint32Array;
    public linkIndices: Uint32Array;
    public detectorIndices: Uint32Array;

    public capacity: number;
    public count: number = 0;

    public constructor(initialCapacity: number) {
        this.capacity = initialCapacity;
        this.nodeData = new Uint8Array(initialCapacity * SoALayout.Node.STRIDE);
        this.extra8NodeData = new Uint8Array(
            initialCapacity * SoALayout.Extra8Node.STRIDE,
        );
        this.extra32NodeData = new Uint32Array(
            initialCapacity * SoALayout.Extra32Node.STRIDE,
        );
        this.linkIndices = new Uint32Array(
            initialCapacity * SoALayout.Links.STRIDE,
        );
        this.detectorIndices = new Uint32Array(
            initialCapacity * SoALayout.Detectors.STRIDE,
        );
    }

    public ensureCapacity(requiredCount: number): void {
        this.count = Math.max(this.count, requiredCount);
        if (this.capacity >= requiredCount) return;

        let newCapacity = this.capacity || 2;
        while (newCapacity < requiredCount) newCapacity *= 2;
        this.capacity = newCapacity;

        this.nodeData = this.realloc(
            this.nodeData,
            newCapacity * SoALayout.Node.STRIDE,
            Uint8Array,
        );
        this.extra8NodeData = this.realloc(
            this.extra8NodeData,
            newCapacity * SoALayout.Extra8Node.STRIDE,
            Uint8Array,
        );
        this.extra32NodeData = this.realloc(
            this.extra32NodeData,
            newCapacity * SoALayout.Extra32Node.STRIDE,
            Uint32Array,
        );
        this.linkIndices = this.realloc(
            this.linkIndices,
            newCapacity * SoALayout.Links.STRIDE,
            Uint32Array,
        );
        this.detectorIndices = this.realloc(
            this.detectorIndices,
            newCapacity * SoALayout.Detectors.STRIDE,
            Uint32Array,
        );
    }

    private realloc<T extends Uint8Array | Uint32Array>(
        src: T,
        newSize: number,
        ctor: new (length: number) => T,
    ): T {
        const dest = new ctor(newSize);
        dest.set(src);
        return dest;
    }

    public clear(): void {
        this.count = 0;
    }

    /*@__INLINE__*/
    public inlineNodeOffset(nodeIdx: number): number {
        return nodeIdx * SoALayout.Node.STRIDE;
    }

    /*@__INLINE__*/
    public inlineExtra8Offset(nodeIdx: number): number {
        return nodeIdx * SoALayout.Extra8Node.STRIDE;
    }

    /*@__INLINE__*/
    public inlineExtra32Offset(nodeIdx: number): number {
        return nodeIdx * SoALayout.Extra32Node.STRIDE;
    }

    /*@__INLINE__*/
    public inlineLinksOffset(nodeIdx: number): number {
        return nodeIdx * SoALayout.Links.STRIDE;
    }

    /*@__INLINE__*/
    public inlineDetectorsOffset(nodeIdx: number): number {
        return nodeIdx * SoALayout.Detectors.STRIDE;
    }
}
