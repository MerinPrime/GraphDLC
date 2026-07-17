import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import {
    GraphEngine,
    GraphEngineSetting,
} from 'src/core/settings/instances/performance/GraphEngineSetting';
import type { ArrowType } from 'src/core/utils/ArrowType';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativeArrow } from 'src/core/utils/getRelativeArrow';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
import { GraphDebugger } from '../debugger/GraphDebugger';
import { NodeType } from '../engines/core/NodeType';
import type { IEngine } from '../engines/core/types';
import { DefaultEngine } from '../engines/default/DefaultEngine';
import { SoAEngine } from '../engines/enhanced/SoAEngine';
import { NativeEngine } from '../engines/native/NativeEngine';
import { RawEngine } from '../engines/raw/RawEngine';
import type { GraphCycle } from './CycleTypes';
import { CycleManager } from './cycle/CycleManager';
import { GraphNode } from './GraphNode';
import type { IGraphListener } from './IGraphListener';

interface PrivateGameMap {
    getOrCreateChunkByArrowCoordinates(x: number, y: number): Chunk;
}

export class Graph {
    private gameMap: GameMap;
    private nodes: GraphNode[] = [];
    private arrows: Arrow[] = [];
    private chunks: Chunk[] = [];
    private cycles: (GraphCycle | null)[] = [];
    private freeCycleIndices: number[] = [];
    public readonly extraRewindNodes: Set<number> = new Set();

    private readonly cycleManager: CycleManager = new CycleManager();
    public readonly debugger: GraphDebugger = new GraphDebugger(this);

    private listeners: IGraphListener[] = [this.cycleManager, this.debugger];

    public engine: IEngine;

    public constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        let engine: IEngine;

        switch (GraphEngineSetting.value) {
            case GraphEngine.ORIGINAL:
                engine = new DefaultEngine(this, this.gameMap);
                break;
            case GraphEngine.STANDARD:
                engine = new RawEngine();
                break;
            case GraphEngine.ENHANCED:
                engine = new SoAEngine();
                break;
            case GraphEngine.NATIVE:
                engine = new NativeEngine();
                break;
        }

        this.engine = engine;
        this.engine.setExtraRewindNodes(this.extraRewindNodes);
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
                this.engine.makeDirtyChunk(node.chunkIdx);
            });
        });
    }

    public getNodes(): readonly GraphNode[] {
        return this.nodes;
    }

    public getChunks(): readonly Chunk[] {
        return this.chunks;
    }

    public getNode(nodeIdx: number): GraphNode {
        return this.nodes[nodeIdx];
    }

    public getArrow(nodeIdx: number): Arrow {
        return this.arrows[nodeIdx];
    }

    public updateNodeRelations(node: GraphNode) {
        const oldLinks = node.links.slice();

        const oldTargets: GraphNode[] = [];
        for (const n of node.links) {
            if (n.detectedLink !== node) oldTargets.push(n);
        }

        const newTargets: GraphNode[] = [];
        const relations = getArrowRelations(node.arrowType);
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
                    this.removeNodeLink(node, n);
                }
            }
        }
        for (const [n, newCount] of newTargetCounts) {
            const oldCount = oldTargetCounts.get(n) || 0;
            if (newCount > oldCount) {
                for (let i = 0; i < newCount - oldCount; i++) {
                    this.addNodeLink(node, n);
                }
            }
        }

        let detectorLink: GraphNode | null = null;
        if (node.type === NodeType.DETECTOR) {
            const { x: backX, y: backY } = getRelativePosition(
                node.globalX,
                node.globalY,
                node.rotation,
                node.flipped,
                1,
                0,
            );
            detectorLink = this.getOrCreateNodeByCoords(backX, backY);
        }

        if (node.detectedLink !== detectorLink) {
            if (node.detectedLink) {
                this.removeNodeLink(node.detectedLink, node);
                node.detectedLink = null;
            }
            if (detectorLink) {
                node.detectedLink = detectorLink;
                this.addNodeLink(detectorLink, node);
            }
        }

        this.engine.updateNodeChange(node, oldLinks);
    }

    public getOrCreateNode(
        arrow: Arrow,
        chunk: Chunk,
        globalX: number,
        globalY: number,
    ): GraphNode {
        if (arrow.astIndex != null) return this.getNode(arrow.astIndex);

        if (chunk.astIndex == null) {
            const chunkIdx = this.chunks.length;
            chunk.astIndex = chunkIdx;
            this.chunks.push(chunk);
            this.listeners.forEach((listener) => {
                listener.onChunkAdded(this, chunk, chunkIdx);
            });
            this.engine.updateChunk(chunk);
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
        this.arrows.push(arrow);
        arrow.astIndex = nodeIdx;
        this.engine.updateNodeState(node);

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
        this.extraRewindNodes.clear();
        this.engine.clear();
        this.listeners.forEach((listener) => {
            listener.onGraphClear(this);
        });
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
        this.updateNodeRelations(node);
        if (oldType !== node.type) {
            this.listeners.forEach((listener) => {
                listener.onNodeTypeChanged(this, node);
            });
            node.backLinks.forEach((backLinkedNode) => {
                this.engine.updateNodeState(backLinkedNode);
            });
        }
        this.engine.updateNodeState(node);
        if (
            node.type === NodeType.DIRECTIONAL_BUTTON ||
            node.type === NodeType.BUTTON ||
            node.type === NodeType.RANDOM
        )
            this.extraRewindNodes.add(node.nodeIdx);
        else this.extraRewindNodes.delete(node.nodeIdx);
    }

    private setNodeType(node: GraphNode, type: ArrowType) {
        node.setType(type);
        this.updateNodeRelations(node);
        this.listeners.forEach((listener) => {
            listener.onNodeTypeChanged(this, node);
        });
        node.backLinks.forEach((backLinkedNode) => {
            this.engine.updateNodeState(backLinkedNode);
        });
        this.engine.updateNodeState(node, true);
        if (
            node.type === NodeType.DIRECTIONAL_BUTTON ||
            node.type === NodeType.BUTTON ||
            node.type === NodeType.RANDOM
        )
            this.extraRewindNodes.add(node.nodeIdx);
        else this.extraRewindNodes.delete(node.nodeIdx);
    }

    private setNodeRotation(node: GraphNode, rotation: number) {
        node.setRotation(rotation);
        this.updateNodeRelations(node);
        this.engine.updateNodeState(node);
    }

    private setNodeFlipped(node: GraphNode, flipped: boolean) {
        node.setFlipped(flipped);
        this.updateNodeRelations(node);
        this.engine.updateNodeState(node);
    }

    private addNodeLink(fromNode: GraphNode, toNode: GraphNode) {
        fromNode.addLink(toNode);
        this.listeners.forEach((listener) => {
            listener.onLinkAdded(this, fromNode, toNode);
        });
        this.engine.updateNodeState(fromNode);
        this.engine.updateNodeState(toNode);
    }

    private removeNodeLink(fromNode: GraphNode, toNode: GraphNode) {
        fromNode.removeLink(toNode);
        this.listeners.forEach((listener) => {
            listener.onLinkRemoved(this, fromNode, toNode);
        });
        this.engine.updateNodeState(fromNode);
        this.engine.updateNodeState(toNode);
    }

    public addCycle(nodes: GraphNode[]): GraphCycle {
        const index = this.allocateCycleIndex();

        const cycle: GraphCycle = {
            index,
            nodes,
            heads: [],
        };
        this.cycles[index] = cycle;

        this.cycleManager.attachNodesToCycle(cycle, nodes);

        this.syncNodesAndHeadsState(cycle.nodes, cycle.heads);

        this.engine.onCycleBuild(cycle);

        this.listeners.forEach((listener) => {
            listener.onCycleAdded(this, cycle);
        });

        return cycle;
    }

    public removeCycle(cycle: GraphCycle) {
        this.engine.onCycleDismantle(cycle);

        const affectedNodes = [...cycle.nodes];
        const affectedHeads = [...cycle.heads];

        this.cycleManager.detachNodesFromCycle(cycle);

        this.syncNodesAndHeadsState(affectedNodes, affectedHeads);

        this.reclaimCycleIndex(cycle.index);

        this.listeners.forEach((listener) => {
            listener.onCycleRemoved(this, cycle);
        });
    }

    private allocateCycleIndex(): number {
        const freeIndex = this.freeCycleIndices.pop();
        return freeIndex !== undefined ? freeIndex : this.cycles.length;
    }

    private reclaimCycleIndex(index: number) {
        if (this.cycles[index] !== null) {
            this.cycles[index] = null;
            this.freeCycleIndices.push(index);
        }
    }

    private syncNodesAndHeadsState(nodes: GraphNode[], heads: GraphNode[]) {
        for (const node of nodes) {
            this.engine.updateNodeState(node);
        }
        for (const head of heads) {
            this.engine.updateNodeState(head);
        }
    }
}
