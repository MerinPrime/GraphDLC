import { Chunk } from "./chunk";
import { ArrowType } from "./arrowType";
import {Arrow} from "./arrow";

export interface GameMap {
    chunks: Map<string, Chunk>;

    setArrowType(x: number, y: number, type: ArrowType, force?: boolean): void;
    setArrowSignal(x: number, y: number, signal: number): void;
    setArrowRotation(x: number, y: number, direction: number, force?: boolean): void;
    setArrowFlipped(x: number, y: number, flipped: boolean, force?: boolean): void;
    getArrowType(x: number, y: number): number;
    resetArrow(x: number, y: number, force?: boolean): void;
    removeArrow(x: number, y: number, force?: boolean): void;
    getArrow(x: number, y: number): Arrow | undefined;
    getChunk(x: number, y: number): Chunk | undefined;
    getOrCreateChunk(x: number, y: number): Chunk;
    clear(): void;
    getChunkByArrowCoordinates(x: number, y: number): Chunk | undefined;
    clearChunkIfEmpty(chunk: Chunk): void;
    setLevelArrow(arrow: any): void;
    getOrCreateChunkByArrowCoordinates(x: number, y: number): Chunk;
    getArrowForEditing(x: number, y: number): Arrow | undefined;
}

export type GameMapProto = new () => GameMap;
