import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import { ArrowTypeCount } from 'src/core/utils/ArrowType';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativeArrow } from 'src/core/utils/getRelativeArrow';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
import { RawNode } from './RawNode';

interface PrivateGameMap {
    getOrCreateChunkByArrowCoordinates(x: number, y: number): Chunk;
}

export class RawGraph {
    private gameMap: GameMap;
    public readonly nodes: RawNode[];

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;
        this.nodes = [];
    }

    getNode(astIndex: number): RawNode {
        return this.nodes[astIndex];
    }

    updateNodeRelations(node: RawNode) {
        const nodeArrow = node.arrow;
        node.clearNext();
        if (node.arrow.type > ArrowTypeCount) {
            node.valid = false;
            return;
        }
        node.valid = true;
        const relations = getArrowRelations(nodeArrow.type);
        const chunk = (
            this.gameMap as any as PrivateGameMap
        ).getOrCreateChunkByArrowCoordinates(node.globalX, node.globalY);
        relations.forEach(([relX, relY]) => {
            const relativeArrow = getRelativeArrow(
                chunk,
                node.localX,
                node.localY,
                nodeArrow.rotation,
                nodeArrow.flipped,
                relX,
                relY,
            );
            const { x: globalRelX, y: globalRelY } = getRelativePosition(
                node.globalX,
                node.globalY,
                nodeArrow.rotation,
                nodeArrow.flipped,
                relX,
                relY,
            );
            const relNode =
                relativeArrow.arrow && relativeArrow.chunk
                    ? this.getOrCreateNode(
                          relativeArrow.arrow,
                          relativeArrow.chunk,
                          globalRelX,
                          globalRelY,
                      )
                    : this.getOrCreateNodeByCoords(globalRelX, globalRelY);
            node.addNext(relNode);
        });
    }

    getOrCreateNode(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
    ): RawNode {
        if (arrow.graphAstIndex) return this.getNode(arrow.graphAstIndex);
        const node = new RawNode(
            arrow,
            this.nodes.length,
            chunk,
            globalX,
            globalY,
        );
        arrow.graphAstIndex = this.nodes.length;
        this.nodes.push(node);
        if (arrow.type > ArrowTypeCount) {
            node.valid = false;
            return node;
        }
        node.valid = true;
        this.updateNodeRelations(node);
        return node;
    }

    getOrCreateNodeByCoords(globalX: number, globalY: number): RawNode {
        const chunk = (
            this.gameMap as any as PrivateGameMap
        ).getOrCreateChunkByArrowCoordinates(globalX, globalY);
        const arrow: Arrow = chunk.getArrow(
            globalX - chunk.x * CHUNK_SIZE,
            globalY - chunk.y * CHUNK_SIZE,
        );

        if (arrow.graphAstIndex) return this.getNode(arrow.graphAstIndex);
        return this.getOrCreateNode(arrow, chunk, globalX, globalY);
    }

    clear() {
        this.nodes.forEach((node) => (node.arrow.graphAstIndex = undefined));
        this.nodes.length = 0;
    }

    updateArrowType(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
        newType: number,
    ) {
        if (process.env.IS_DEBUG)
            console.log('[Graph] Change arrow type to', newType);
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);
        this.updateNodeRelations(node);
    }

    updateArrowRotation(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
        newRotation: number,
    ) {
        if (process.env.IS_DEBUG)
            console.log('[Graph] Change arrow rotation to', newRotation);
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);
        this.updateNodeRelations(node);
    }

    updateArrowFlipped(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
        newFlipped: boolean,
    ) {
        if (process.env.IS_DEBUG)
            console.log('[Graph] Change arrow flipped to', newFlipped);
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);
        this.updateNodeRelations(node);
    }
}
