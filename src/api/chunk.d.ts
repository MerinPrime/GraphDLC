import {Arrow} from "./arrow";

export interface Chunk {
    x: number;
    y: number;
    arrows: Arrow[];
    adjacentChunks: (Chunk | undefined)[];
    
    getArrow(x: number, y: number): Arrow;
}