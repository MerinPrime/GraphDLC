import { CHUNK_AREA } from '@logic-arrows/game-logic/game-constants';
import { ArrowType } from '../utils/ArrowType';
import { NodeStatus } from './types';

export class BiSearchNode {
    public gScore: [number, number] = [Infinity, Infinity];
    public status: [NodeStatus, NodeStatus] = [
        NodeStatus.UNVISITED,
        NodeStatus.UNVISITED,
    ];
    public parent: [number, number] = [-1, -1];
    public arrowType: [ArrowType, ArrowType] = [
        ArrowType.ARROW,
        ArrowType.ARROW,
    ];
    public arrowRotation: [number, number] = [0, 0];
    public arrowFlipped: [boolean, boolean] = [false, false];
}

export class BiSearchChunk {
    public nodes: BiSearchNode[] = Array.from(
        { length: CHUNK_AREA },
        () => new BiSearchNode(),
    );
}

export class SearchGridManager {
    private chunks = new Map<number, BiSearchChunk>();

    public clear(): void {
        this.chunks.clear();
    }

    public pack(x: number, y: number): number {
        return (x << 16) | (y & 0xffff);
    }

    public unpack(packed: number): { x: number; y: number } {
        return {
            x: packed >> 16,
            y: (packed << 16) >> 16,
        };
    }

    public getNode(packed: number): BiSearchNode {
        const x = packed >> 16;
        const y = (packed << 16) >> 16;

        const cx = x >> 4;
        const cy = y >> 4;
        const chunkKey = (cx << 16) | (cy & 0xffff);

        let chunk = this.chunks.get(chunkKey);
        if (!chunk) {
            chunk = new BiSearchChunk();
            this.chunks.set(chunkKey, chunk);
        }

        const cellIdx = (x & 15) | ((y & 15) << 4);
        return chunk.nodes[cellIdx];
    }
}
