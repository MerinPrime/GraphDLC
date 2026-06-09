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
import type { RawCycle } from './CycleTypes';
import { RawNode } from './RawNode';
import { RawGraphState } from './updater/RawState';
import { RawGraphUpdater } from './updater/RawUpdater';

interface PrivateGameMap {
    getOrCreateChunkByArrowCoordinates(x: number, y: number): Chunk;
}

export class RawGraph {
    private gameMap: GameMap;
    public nodes: RawNode[];
    private chunks: Chunk[];
    public entryPoints: RawNode[];
    public cycles: (RawCycle | null)[];
    private freeCycleIndices: number[];

    public graphState: RawGraphState;
    public graphUpdater: RawGraphUpdater;
    // TODO: Incapsulate graph updater to game engine for ast engine, soa engine, rust engine
    public cycleManager: CycleManager;

    public constructor(gameMap: GameMap) {
        this.gameMap = gameMap;
        this.nodes = [];
        this.chunks = [];
        this.entryPoints = [];
        this.cycles = [];
        this.freeCycleIndices = [];

        this.graphState = new RawGraphState();
        this.graphUpdater = new RawGraphUpdater();
        this.cycleManager = new CycleManager(this);
    }

    public getChunkByIdx(chunkIdx: number): Chunk {
        return this.chunks[chunkIdx];
    }

    public getAllChunks(): readonly Chunk[] {
        return this.chunks;
    }

    public addCycle(nodes: RawNode[]): RawCycle {
        let index: number;
        const freeIndex = this.freeCycleIndices.pop();
        if (freeIndex !== undefined) {
            index = freeIndex;
        } else {
            index = this.cycles.length;
        }

        const cycle: RawCycle = {
            index,
            nodes,
            heads: [],
        };
        this.cycles[index] = cycle;
        return cycle;
    }

    public removeCycle(cycle: RawCycle) {
        if (this.cycles[cycle.index] === cycle) {
            this.cycles[cycle.index] = null;
            this.graphState.cycles[cycle.index] = null;
            this.freeCycleIndices.push(cycle.index);
        }
    }

    public getNode(astIndex: number): RawNode {
        return this.nodes[astIndex];
    }

    public updateNodeRelations(node: RawNode) {
        const oldNextFull = node.next.slice();

        const oldTargets: RawNode[] = [];
        for (const n of node.next) {
            if (n.detectedNode !== node) oldTargets.push(n);
        }

        const newTargets: RawNode[] = [];
        if (node.type <= ArrowTypeCount) {
            node.valid = true;
            const relations = getArrowRelations(node.type);
            const chunk = (
                this.gameMap as any as PrivateGameMap
            ).getOrCreateChunkByArrowCoordinates(node.globalX, node.globalY);
            relations.forEach(([relX, relY]) => {
                const relativeArrow = getRelativeArrow(
                    chunk,
                    node.localX,
                    node.localY,
                    node.rotation,
                    node.flipped,
                    relX,
                    relY,
                );
                const { x: globalRelX, y: globalRelY } = getRelativePosition(
                    node.globalX,
                    node.globalY,
                    node.rotation,
                    node.flipped,
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
                    this.removeNodeNext(node, n);
                }
            }
        }
        for (const [n, newCount] of newTargetCounts) {
            const oldCount = oldTargetCounts.get(n) || 0;
            if (newCount > oldCount) {
                for (let i = 0; i < newCount - oldCount; i++) {
                    this.addNodeNext(node, n);
                }
            }
        }

        let newDetectedNode: RawNode | null = null;
        if (node.type === ArrowType.DETECTOR) {
            const { x: backX, y: backY } = getRelativePosition(
                node.globalX,
                node.globalY,
                node.rotation,
                node.flipped,
                1,
                0,
            );
            newDetectedNode = this.getOrCreateNodeByCoords(backX, backY);
        }

        if (node.detectedNode !== newDetectedNode) {
            if (node.detectedNode) {
                const oldDetected = node.detectedNode;
                this.removeNodeNext(oldDetected, node);
            }
            node.detectedNode = newDetectedNode;
            if (newDetectedNode) {
                this.addNodeNext(newDetectedNode, node);
            }
        }

        this.graphUpdater.updateNodeChange(
            this.graphState,
            node,
            oldNextFull,
            node.next,
        );
    }

    public getOrCreateNode(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
    ): RawNode {
        if (arrow.astIndex != null) return this.getNode(arrow.astIndex);

        if (chunk.astIndex == null) {
            chunk.astIndex = this.chunks.length;
            this.chunks.push(chunk);
        }

        const chunkIdx = chunk.astIndex;
        const nodeIdx = this.nodes.length;
        const localX = globalX - chunk.x * CHUNK_SIZE;
        const localY = globalY - chunk.y * CHUNK_SIZE;

        const node = new RawNode(
            arrow,
            nodeIdx,
            chunkIdx,
            globalX,
            globalY,
            localX,
            localY,
        );
        this.nodes.push(node);
        arrow.astIndex = nodeIdx;

        this.graphState.update(this);
        if (arrow.type > ArrowTypeCount) {
            node.valid = false;
            return node;
        }
        node.valid = true;
        // TIP: probably not needed cuz every changing using updateArrow*
        // this.updateNodeRelations(node);
        return node;
    }

    public getOrCreateNodeByCoords(globalX: number, globalY: number): RawNode {
        const chunk = (
            this.gameMap as any as PrivateGameMap
        ).getOrCreateChunkByArrowCoordinates(globalX, globalY);
        const arrow: Arrow = chunk.getArrow(
            globalX - chunk.x * CHUNK_SIZE,
            globalY - chunk.y * CHUNK_SIZE,
        );

        if (arrow.astIndex != null) return this.getNode(arrow.astIndex);
        return this.getOrCreateNode(arrow, chunk, globalX, globalY);
    }

    public clear() {
        this.nodes.forEach((node) => {
            node.arrow.astIndex = undefined;
        });
        this.nodes.length = 0;
        this.cycles.length = 0;
        this.freeCycleIndices.length = 0;
    }

    public updateArrowType(
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

        const nodeState = this.graphState.nodes[node.nodeIdx];
        nodeState.isEntryPoint = newEntryPoint;
        nodeState.isAdditionalUpdate = isAdditionalUpdate;
        nodeState.lastSignal = 0;
        nodeState.signal = 0;
        this.setNodeType(node, newType);

        if (oldEntryPoint === newEntryPoint) return;

        if (newEntryPoint) this.entryPoints.push(node);
        else removeWithSwap(this.entryPoints, node);
    }

    public updateArrowRotation(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
        newRotation: number,
    ) {
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);
        this.setNodeRotation(node, newRotation);
    }

    public updateArrowFlipped(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
        newFlipped: boolean,
    ) {
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);
        this.setNodeFlipped(node, newFlipped);
    }

    public updateArrowState(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
    ) {
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);
        this.updateNodeState(node, arrow.type, arrow.rotation, arrow.flipped);
    }

    private updateNodeState(
        node: RawNode,
        type: ArrowType,
        rotation: number,
        flipped: boolean,
    ) {
        const isTypeChanged = node.type === type;
        node.setType(type);
        node.setRotation(rotation);
        node.setFlipped(flipped);
        this.updateNodeRelations(node);
        if (isTypeChanged) this.cycleManager.onChangeType(node);
    }

    private setNodeType(node: RawNode, type: ArrowType) {
        node.setType(type);
        this.updateNodeRelations(node);
        this.cycleManager.onChangeType(node);
    }

    private setNodeRotation(node: RawNode, rotation: number) {
        node.setRotation(rotation);
        this.updateNodeRelations(node);
    }

    private setNodeFlipped(node: RawNode, flipped: boolean) {
        node.setFlipped(flipped);
        this.updateNodeRelations(node);
    }

    private addNodeNext(node: RawNode, nextNode: RawNode) {
        node.addNext(nextNode);
        this.cycleManager.onAddNext(node, nextNode);
    }

    private removeNodeNext(node: RawNode, nextNode: RawNode) {
        node.removeNext(nextNode);
        this.cycleManager.onRemoveNext(node, nextNode);
    }
}
