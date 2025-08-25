import { Arrow } from "./arrow";

export interface Chunk {
    x: number;
    y: number;
    adjacentChunks: Array<Chunk | undefined>;
    arrows: Arrow[];
    levelArrows: Map<number, Arrow>;
    
    getArrow(x: number, y: number): Arrow;
    removeArrow(x: number, y: number): void;
    getLevelArrow(x: number, y: number): Arrow | undefined;
    isEmpty(): boolean;
    getArrowTypes(): number[];
    clear(): void;
}

export type ChunkProto = new (x: number, y: number) => Chunk;
