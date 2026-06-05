import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import {
    ArrowType,
    ArrowTypeCount,
    IsAdditionalUpdate,
    IsArrowEntryPoint,
} from 'src/core/utils/ArrowType';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativeArrow } from 'src/core/utils/getRelativeArrow';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import { RawNode } from './RawNode';
import { RawGraphState } from './updater/RawState';
import { RawGraphUpdater } from './updater/RawUpdater';

interface PrivateGameMap {
    getOrCreateChunkByArrowCoordinates(x: number, y: number): Chunk;
}

export class RawGraph {
    private gameMap: GameMap;
    public nodes: RawNode[];
    public entryPoints: RawNode[];

    public graphState: RawGraphState;
    public graphUpdater: RawGraphUpdater;

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;
        this.nodes = [];
        this.entryPoints = [];

        this.graphState = new RawGraphState();
        this.graphUpdater = new RawGraphUpdater();
    }

    getNode(astIndex: number): RawNode {
        return this.nodes[astIndex];
    }

    updateNodeRelations(node: RawNode, oldType: number, newType: number) {
        const nodeArrow = node.arrow;
        const oldNext = node.next.slice();
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
        const newNext = node.next;

        if (oldType === ArrowType.DETECTOR && node.detectedNode) {
            node.detectedNode.removeNext(node);
            node.detectedNode = null;
        }
        if (newType === ArrowType.DETECTOR) {
            const { x: backX, y: backY } = getRelativePosition(
                node.globalX,
                node.globalY,
                node.arrow.rotation,
                node.arrow.flipped,
                1,
                0,
            );
            const backNode = this.getOrCreateNodeByCoords(backX, backY);
            backNode.addNext(node);
            node.detectedNode = backNode;
        }

        this.graphUpdater.updateNodeChange(
            this.graphState,
            node,
            oldNext,
            newNext,
        );
    }

    getOrCreateNode(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
    ): RawNode {
        if (arrow.graphAstIndex != null)
            return this.getNode(arrow.graphAstIndex);
        const node = new RawNode(
            arrow,
            this.nodes.length,
            chunk,
            globalX,
            globalY,
        );
        arrow.graphAstIndex = this.nodes.length;
        this.nodes.push(node);
        this.graphState.update(this);
        if (arrow.type > ArrowTypeCount) {
            node.valid = false;
            return node;
        }
        node.valid = true;
        this.updateNodeRelations(node, 0, arrow.type);
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

        if (arrow.graphAstIndex != null)
            return this.getNode(arrow.graphAstIndex);
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
        oldType: number,
        newType: number,
    ) {
        // if (process.env.IS_DEBUG)
        //     console.log('[Graph] Change arrow type to', newType);
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);

        const oldEntryPoint = IsArrowEntryPoint(oldType);
        const newEntryPoint = IsArrowEntryPoint(newType);
        const isAdditionalUpdate = IsAdditionalUpdate(newType);

        const nodeState = this.graphState.nodes[node.index];
        nodeState.isEntryPoint = newEntryPoint;
        nodeState.isAdditionalUpdate = isAdditionalUpdate;
        this.updateNodeRelations(node, oldType, newType);
        nodeState.signal = 0;

        if (oldEntryPoint === newEntryPoint) return;

        if (newEntryPoint) this.entryPoints.push(node);
        else removeWithSwap(this.entryPoints, node);
    }

    updateArrowRotation(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
        newRotation: number,
    ) {
        // if (process.env.IS_DEBUG)
        //     console.log('[Graph] Change arrow rotation to', newRotation);
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);
        this.updateNodeRelations(node, arrow.type, arrow.type);
    }

    updateArrowFlipped(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
        newFlipped: boolean,
    ) {
        // if (process.env.IS_DEBUG)
        //     console.log('[Graph] Change arrow flipped to', newFlipped);
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);
        this.updateNodeRelations(node, arrow.type, arrow.type);
    }
}
