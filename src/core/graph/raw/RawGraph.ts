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
import { CycleManager } from './CycleManager';
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
    // TODO: Incapsulate graph updater to game engine for ast engine, soa engine, rust engine
    public cycleManager: CycleManager;

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;
        this.nodes = [];
        this.entryPoints = [];

        this.graphState = new RawGraphState();
        this.graphUpdater = new RawGraphUpdater();
        this.cycleManager = new CycleManager();
    }

    getNode(astIndex: number): RawNode {
        return this.nodes[astIndex];
    }

    updateNodeRelations(node: RawNode, oldType: number, newType: number) {
        const nodeArrow = node.arrow;
        const oldNextFull = node.next.slice();

        const oldTargets: RawNode[] = [];
        for (const n of node.next) {
            if (n.detectedNode !== node) oldTargets.push(n);
        }

        const newTargets: RawNode[] = [];
        if (node.arrow.type <= ArrowTypeCount) {
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
                newTargets.push(relNode);
            });
        } else {
            node.valid = false;
        }

        const oldTargetCounts = new Map<RawNode, number>();
        for (const n of oldTargets)
            oldTargetCounts.set(n, (oldTargetCounts.get(n) || 0) + 1);

        const newTargetCounts = new Map<RawNode, number>();
        for (const n of newTargets)
            newTargetCounts.set(n, (newTargetCounts.get(n) || 0) + 1);

        for (const [n, oldCount] of oldTargetCounts) {
            const newCount = newTargetCounts.get(n) || 0;
            if (oldCount > newCount) {
                for (let i = 0; i < oldCount - newCount; i++) {
                    node.removeNext(n);
                    this.cycleManager.onRemoveNext(node, n);
                }
            }
        }
        for (const [n, newCount] of newTargetCounts) {
            const oldCount = oldTargetCounts.get(n) || 0;
            if (newCount > oldCount) {
                for (let i = 0; i < newCount - oldCount; i++) {
                    node.addNext(n);
                    this.cycleManager.onAddNext(node, n);
                }
            }
        }

        let newDetectedNode: RawNode | null = null;
        if (newType === ArrowType.DETECTOR) {
            const { x: backX, y: backY } = getRelativePosition(
                node.globalX,
                node.globalY,
                node.arrow.rotation,
                node.arrow.flipped,
                1,
                0,
            );
            newDetectedNode = this.getOrCreateNodeByCoords(backX, backY);
        }

        if (node.detectedNode !== newDetectedNode) {
            if (node.detectedNode) {
                const oldDetected = node.detectedNode;
                oldDetected.removeNext(node);
                this.cycleManager.onRemoveNext(oldDetected, node);
            }
            node.detectedNode = newDetectedNode;
            if (newDetectedNode) {
                newDetectedNode.addNext(node);
                this.cycleManager.onAddNext(newDetectedNode, node);
            }
        }

        this.graphUpdater.updateNodeChange(
            this.graphState,
            node,
            oldNextFull,
            node.next,
            oldType,
            newType,
            newType === oldType,
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

    // Optimize update calls
    // Also store chunks for future

    updateArrowType(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
        oldType: number,
        newType: number,
    ) {
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);

        const oldEntryPoint = IsArrowEntryPoint(oldType);
        const newEntryPoint = IsArrowEntryPoint(newType);
        const isAdditionalUpdate = IsAdditionalUpdate(newType);

        const nodeState = this.graphState.nodes[node.index];
        nodeState.isEntryPoint = newEntryPoint;
        nodeState.isAdditionalUpdate = isAdditionalUpdate;
        this.updateNodeRelations(node, oldType, newType);
        nodeState.lastSignal = 0;
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
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);
        this.updateNodeRelations(node, arrow.type, arrow.type);
    }
}
