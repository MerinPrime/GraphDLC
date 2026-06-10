import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import { ArrowType } from 'src/core/utils/ArrowType';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativeArrow } from 'src/core/utils/getRelativeArrow';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
import { CycleManager } from './CycleManager';
import { CycleHeadType, type RawCycle } from './CycleTypes';
import { GraphNode } from './GraphNode';
import { StateRewinder } from './StateRewinder';
import { RawGraphState } from './updater/RawState';
import { RawGraphUpdater } from './updater/RawUpdater';

interface PrivateGameMap {
    getOrCreateChunkByArrowCoordinates(x: number, y: number): Chunk;
}

export class Graph {
    private gameMap: GameMap;
    private nodes: GraphNode[];
    private chunks: Chunk[];
    public cycles: (RawCycle | null)[];
    private freeCycleIndices: number[];

    public graphState: RawGraphState;
    public stateRewinder: StateRewinder;
    public graphUpdater: RawGraphUpdater;
    // TODO: Incapsulate graph updater to game engine for ast engine, soa engine, rust engine
    public cycleManager: CycleManager;

    public constructor(gameMap: GameMap) {
        this.gameMap = gameMap;
        this.nodes = [];
        this.chunks = [];
        this.cycles = [];
        this.freeCycleIndices = [];

        this.graphState = new RawGraphState();
        this.graphUpdater = new RawGraphUpdater();
        this.cycleManager = new CycleManager(this);
        this.stateRewinder = new StateRewinder();
    }

    public getChunkByIdx(chunkIdx: number): Chunk {
        return this.chunks[chunkIdx];
    }

    public getAllChunks(): readonly Chunk[] {
        return this.chunks;
    }

    public addCycle(nodes: GraphNode[]): RawCycle {
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

        for (const n of nodes) {
            n.isCycle = true;
            n.cycleRef = cycle;
        }

        this.cycleManager.refreshCycleIO(cycle);
        cycle.nodes.forEach((node) => {
            this.graphState.updateNode(node);
        });
        cycle.heads.forEach((head) => {
            this.graphState.updateNode(head);
        });
        this.graphUpdater.onCycleBuild(this.graphState, cycle);

        return cycle;
    }

    public removeCycle(cycle: RawCycle) {
        this.graphUpdater.onCycleDismantle(this.graphState, cycle);

        for (const node of cycle.nodes) {
            node.isCycle = false;
            node.cycleRef = null;
            node.headType = CycleHeadType.NONE;
            node.cycleOffset = 0;
            this.graphState.updateNode(node);
        }

        cycle.heads.forEach((head) => {
            this.cycleManager.resetHead(head);
            this.graphState.updateNode(head);
        });

        if (this.cycles[cycle.index] === cycle) {
            this.cycles[cycle.index] = null;
            this.graphState.cycles[cycle.index] = null;
            this.freeCycleIndices.push(cycle.index);
        }
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
        if (oldType !== node.type) this.cycleManager.onChangeType(node);
    }

    private setNodeType(node: GraphNode, type: ArrowType) {
        node.setType(type);
        this.updateNodeRelations(node);
        this.cycleManager.onChangeType(node);
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
        this.cycleManager.onAddNext(node, nextNode);
        this.graphState.updateNode(node);
    }

    private removeNodeNext(node: GraphNode, nextNode: GraphNode) {
        node.removeNext(nextNode);
        this.cycleManager.onRemoveNext(node, nextNode);
        this.graphState.updateNode(node);
    }
}
