import {Arrow} from "./arrow";

export interface Chunk {
    arrows: Arrow[];
    adjacentChunks: (Chunk | undefined)[];
    
    getArrow(x: number, y: number): Arrow;
}