import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import { ArrowType } from 'src/core/utils/ArrowType';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativeArrow } from 'src/core/utils/getRelativeArrow';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
import type { IEngine } from '../engines/core/types';
import { RawEngine } from '../engines/raw/RawEngine';
import type { RawGraphState } from '../engines/raw/RawState';
import { CycleManager } from './CycleManager';
import type { RawCycle } from './CycleTypes';
import { GraphNode } from './GraphNode';

interface PrivateGameMap {
    getOrCreateChunkByArrowCoordinates(x: number, y: number): Chunk;
}

export class Graph {
    private gameMap: GameMap;
    private nodes: GraphNode[] = [];
    private chunks: Chunk[] = [];
    private cycles: (RawCycle | null)[] = [];
    private freeCycleIndices: number[] = [];

    private readonly cycleManager: CycleManager = new CycleManager();

    // TODO: Incapsulate graph updater to game engine for ast engine, soa engine, rust engine
    public graphState: RawGraphState;

    public engine: IEngine;

    public constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        this.engine = new RawEngine();

        this.graphState = (this.engine as any).state;
    }

    public getChunkByIdx(chunkIdx: number): Chunk {
        return this.chunks[chunkIdx];
    }

    public getAllChunks(): readonly Chunk[] {
        return this.chunks;
    }

    public markCyclesChunksDirty() {
        this.cycles.forEach((cycle) => {
            if (cycle === null) return;
            cycle.nodes.forEach((node) => {
                this.graphState.makeDirtyChunk(node.chunkIdx);
            });
        });
    }

    public getNodes(): readonly GraphNode[] {
        return this.nodes;
    }

    public getNode(nodeIdx: number): GraphNode {
        return this.nodes[nodeIdx];
    }

    public updateNodeRelations(node: GraphNode) {
        const oldNextFull = node.next.slice();

        const oldTargets: GraphNode[] = [];
        for (const n of node.next) {
            if (n.detectedNode !== node) oldTargets.push(n);
        }

        const newTargets: GraphNode[] = [];
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

        const oldTargetCounts = new Map<GraphNode, number>();
        for (const n of oldTargets)
            oldTargetCounts.set(n, (oldTargetCounts.get(n) || 0) + 1);

        const newTargetCounts = new Map<GraphNode, number>();
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

        let newDetectedNode: GraphNode | null = null;
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

        this.engine.updateNodeChange(node, oldNextFull, node.next);
    }

    public getOrCreateNode(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
    ): GraphNode {
        if (arrow.astIndex != null) return this.getNode(arrow.astIndex);

        if (chunk.astIndex == null) {
            chunk.astIndex = this.chunks.length;
            this.chunks.push(chunk);
            this.graphState.updateChunk(chunk);
        }

        const chunkIdx = chunk.astIndex;
        const nodeIdx = this.nodes.length;
        const localX = globalX - chunk.x * CHUNK_SIZE;
        const localY = globalY - chunk.y * CHUNK_SIZE;

        const node = new GraphNode(
            nodeIdx,
            chunkIdx,
            globalX,
            globalY,
            localX,
            localY,
        );
        this.nodes.push(node);
        arrow.astIndex = nodeIdx;

        this.graphState.updateNode(node);
        // TIP: probably not needed cuz every changing using updateArrow*
        // this.graphState.update(this);
        // this.updateNodeRelations(node);
        return node;
    }

    public getOrCreateNodeByCoords(
        globalX: number,
        globalY: number,
    ): GraphNode {
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
        this.nodes.length = 0;
        this.cycles.length = 0;
        this.freeCycleIndices.length = 0;
        this.graphState.clear();
    }

    public updateArrowType(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
        _oldType: number,
        newType: number,
    ) {
        const node = this.getOrCreateNode(arrow, chunk, globalX, globalY);
        this.setNodeType(node, newType);
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
        node: GraphNode,
        type: ArrowType,
        rotation: number,
        flipped: boolean,
    ) {
        const oldType = node.type;

        node.setType(type);
        node.setRotation(rotation);
        node.setFlipped(flipped);
        this.graphState.updateNode(node);
        this.updateNodeRelations(node);
        if (oldType !== node.type) this.cycleManager.onChangeType(this, node);
    }

    private setNodeType(node: GraphNode, type: ArrowType) {
        node.setType(type);
        this.updateNodeRelations(node);
        this.cycleManager.onChangeType(this, node);
        this.graphState.updateNode(node);
    }

    private setNodeRotation(node: GraphNode, rotation: number) {
        node.setRotation(rotation);
        this.updateNodeRelations(node);
        this.graphState.updateNode(node);
    }

    private setNodeFlipped(node: GraphNode, flipped: boolean) {
        node.setFlipped(flipped);
        this.updateNodeRelations(node);
        this.graphState.updateNode(node);
    }

    private addNodeNext(node: GraphNode, nextNode: GraphNode) {
        node.addNext(nextNode);
        this.cycleManager.onAddNext(this, node, nextNode);
        this.graphState.updateNode(node);
    }

    private removeNodeNext(node: GraphNode, nextNode: GraphNode) {
        node.removeNext(nextNode);
        this.cycleManager.onRemoveNext(this, node, nextNode);
        this.graphState.updateNode(node);
    }

    public addCycle(nodes: GraphNode[]): RawCycle {
        const index = this.allocateCycleIndex();

        const cycle: RawCycle = {
            index,
            nodes,
            heads: [],
        };
        this.cycles[index] = cycle;

        this.cycleManager.attachNodesToCycle(cycle, nodes);

        this.syncNodesAndHeadsState(cycle.nodes, cycle.heads);

        this.engine.onCycleBuild(cycle);

        return cycle;
    }

    public removeCycle(cycle: RawCycle) {
        this.engine.onCycleDismantle(cycle);

        const affectedNodes = [...cycle.nodes];
        const affectedHeads = [...cycle.heads];

        this.cycleManager.detachNodesFromCycle(cycle);

        this.syncNodesAndHeadsState(affectedNodes, affectedHeads);

        this.reclaimCycleIndex(cycle.index);
    }

    private allocateCycleIndex(): number {
        const freeIndex = this.freeCycleIndices.pop();
        return freeIndex !== undefined ? freeIndex : this.cycles.length;
    }

    private reclaimCycleIndex(index: number) {
        if (this.cycles[index] !== null) {
            this.cycles[index] = null;
            this.graphState.cycles[index] = null;
            this.freeCycleIndices.push(index);
        }
    }

    private syncNodesAndHeadsState(nodes: GraphNode[], heads: GraphNode[]) {
        for (const node of nodes) {
            this.graphState.updateNode(node);
        }
        for (const head of heads) {
            this.graphState.updateNode(head);
        }
    }
}
