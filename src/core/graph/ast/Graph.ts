import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GraphCycle } from 'src/core/graph/ast/cycle/CycleTypes';
import type { ArrowType } from 'src/core/utils/ArrowType';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativeArrow } from 'src/core/utils/getRelativeArrow';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
import { EnableSnapshotsSetting } from 'src/plugins/graphdlc/settings/performance/EnableSnapshotsSetting';
import {
    BreakpointMode,
    EnableBreakpointSetting,
} from 'src/plugins/graphdlc/settings/tools/EnableBreakpointSetting';
import { GraphDebugger } from '../debugger/GraphDebugger';
import { NodeType } from '../engines/core/NodeType';
import type { BaseEngine, EngineTypes } from '../engines/core/types/BaseEngine';
import { EngineFactory } from '../engines/EngineFactory';
import { CycleManager } from './cycle/CycleManager';
import { GraphNode } from './GraphNode';
import type { IGraphListener } from './IGraphListener';

interface PrivateGameMap {
    getOrCreateChunkByArrowCoordinates(x: number, y: number): Chunk;
}

export class Graph {
    private gameMap: GameMap;
    private privateGameMap: PrivateGameMap;
    private nodes: GraphNode[] = [];
    private arrows: Arrow[] = [];
    private chunks: Chunk[] = [];
    private cycles: (GraphCycle | null)[] = [];
    private freeCycleIndices: number[] = [];
    public readonly extraRewindNodes: Set<number> = new Set();

    private readonly cycleManager: CycleManager = new CycleManager();
    public readonly debugger: GraphDebugger = new GraphDebugger(this);

    private listeners: IGraphListener[] = [];

    public engine: BaseEngine<EngineTypes>;

    private _lastUpdate: number = 0;

    private readonly handleBreakpointChange = (newState: BreakpointMode) => {
        this.engine.setBreakpointState(newState !== BreakpointMode.OFF);
    };

    private readonly handleSnapshotsChange = (newState: boolean) => {
        this.engine.setSnapshotsState(newState);
    };

    public constructor(gameMap: GameMap) {
        this.gameMap = gameMap;
        this.privateGameMap = gameMap as any as PrivateGameMap;

        this.listeners.push(this.debugger);
        this.listeners.push(this.cycleManager);

        this.engine = EngineFactory.create(this, this.gameMap);
        this.engine.setExtraRewindNodes(this.extraRewindNodes);

        EnableBreakpointSetting.onChange.add(this.handleBreakpointChange);
        this.handleBreakpointChange(EnableBreakpointSetting.value);
        EnableSnapshotsSetting.onChange.add(this.handleSnapshotsChange);
        this.handleSnapshotsChange(EnableSnapshotsSetting.value);
    }

    public get lastUpdate(): number {
        return this._lastUpdate;
    }

    public getChunkByIdx(chunkIdx: number): Chunk {
        return this.chunks[chunkIdx];
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

    public getNodeByArrow(arrow: Arrow): GraphNode | null {
        const astIndex = arrow.astIndex;
        if (astIndex === null || astIndex === undefined) {
            return null;
        }
        return this.getNode(astIndex);
    }

    public getArrow(nodeIdx: number): Arrow {
        return this.arrows[nodeIdx];
    }

    public updateNodeRelations(node: GraphNode) {
        const oldLinks = node.links.slice();

        const oldTargets: GraphNode[] = [];
        for (let i = 0; i < node.links.length; i++) {
            const n = node.links[i];
            if (n.detectedLink !== node || node.linkCounts[i] > 1) {
                oldTargets.push(n);
            }
        }
        const newTargets: GraphNode[] = [];

        const relations = getArrowRelations(node.arrowType);
        const chunk = this.privateGameMap.getOrCreateChunkByArrowCoordinates(
            node.globalX,
            node.globalY,
        );

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

        for (const oldTarget of oldTargets) {
            if (!newTargets.includes(oldTarget)) {
                this.removeNodeLink(node, oldTarget);
            }
        }

        for (const newTarget of newTargets) {
            if (!oldTargets.includes(newTarget)) {
                this.addNodeLink(node, newTarget);
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

        let blockedLink: GraphNode | null = null;
        if (node.type === NodeType.BLOCKER) {
            const { x: backX, y: backY } = getRelativePosition(
                node.globalX,
                node.globalY,
                node.rotation,
                node.flipped,
                -1,
                0,
            );
            blockedLink = this.getOrCreateNodeByCoords(backX, backY);
        }

        if (node.blockedLink !== blockedLink) {
            node.blockedLink = blockedLink;
            this.engine.updateNodeState(node);
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

        for (const backNode of node.backLinks) {
            if (
                backNode.type === NodeType.DETECTOR &&
                backNode.detectedLink === node
            ) {
                this.engine.updateNodeState(backNode);
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

        this.listeners.forEach((listener) => {
            listener.onNodeAdded(this, node);
        });

        return node;
    }

    public getOrCreateNodeByCoords(
        globalX: number,
        globalY: number,
    ): GraphNode {
        const chunk = this.privateGameMap.getOrCreateChunkByArrowCoordinates(
            globalX,
            globalY,
        );
        const arrow: Arrow = chunk.getArrow(
            globalX - chunk.x * CHUNK_SIZE,
            globalY - chunk.y * CHUNK_SIZE,
        );

        if (arrow.astIndex != null) return this.getNode(arrow.astIndex);
        return this.getOrCreateNode(arrow, chunk, globalX, globalY);
    }

    public clear() {
        EnableBreakpointSetting.onChange.remove(this.handleBreakpointChange);
        EnableSnapshotsSetting.onChange.remove(this.handleSnapshotsChange);

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
        if (
            node.arrowType === type &&
            node.rotation === rotation &&
            node.flipped === flipped
        )
            return;

        const oldType = node.type;
        if (node.arrowType !== type) {
            this.engine.resetNodeSignal(node);
        }
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
        this._lastUpdate = Date.now();
    }

    private setNodeType(node: GraphNode, type: ArrowType) {
        this.engine.resetNodeSignal(node);
        node.setType(type);
        this.updateNodeRelations(node);
        this.listeners.forEach((listener) => {
            listener.onNodeTypeChanged(this, node);
        });
        node.backLinks.forEach((backLinkedNode) => {
            this.engine.updateNodeState(backLinkedNode);
        });
        this.engine.updateNodeState(node);
        if (
            node.type === NodeType.DIRECTIONAL_BUTTON ||
            node.type === NodeType.BUTTON ||
            node.type === NodeType.RANDOM
        )
            this.extraRewindNodes.add(node.nodeIdx);
        else this.extraRewindNodes.delete(node.nodeIdx);
        this._lastUpdate = Date.now();
    }

    private setNodeRotation(node: GraphNode, rotation: number) {
        node.setRotation(rotation);
        this.updateNodeRelations(node);
        this.engine.updateNodeState(node);
        this._lastUpdate = Date.now();
    }

    private setNodeFlipped(node: GraphNode, flipped: boolean) {
        node.setFlipped(flipped);
        this.updateNodeRelations(node);
        this.engine.updateNodeState(node);
        this._lastUpdate = Date.now();
    }

    private addNodeLink(fromNode: GraphNode, toNode: GraphNode) {
        fromNode.addLink(toNode);
        this.listeners.forEach((listener) => {
            listener.onLinkAdded(this, fromNode, toNode);
        });
        this.engine.updateNodeState(fromNode);
        this.engine.updateNodeState(toNode);
        this._lastUpdate = Date.now();
    }

    private removeNodeLink(fromNode: GraphNode, toNode: GraphNode) {
        fromNode.removeLink(toNode);
        this.listeners.forEach((listener) => {
            listener.onLinkRemoved(this, fromNode, toNode);
        });
        this.engine.updateNodeState(fromNode);
        this.engine.updateNodeState(toNode);
        this._lastUpdate = Date.now();
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
