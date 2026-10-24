import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GraphCycle, HeadData } from 'src/core/graph/ast/cycle/types';
import type { ArrowType } from 'src/core/utils/ArrowType';
import { EventDispatcher } from 'src/core/utils/EventDispatcher';
import { getArrowRelations } from 'src/core/utils/getArrowRelations';
import { getRelativeArrow } from 'src/core/utils/getRelativeArrow';
import { getRelativePosition } from 'src/core/utils/getRelativePosition';
import { EnableSnapshotsSetting } from 'src/plugins/graphdlc/settings/performance/EnableSnapshotsSetting';
import {
    BreakpointMode,
    EnableBreakpointSetting,
} from 'src/plugins/graphdlc/settings/tools/EnableBreakpointSetting';
import { GraphDebugger } from '../debugger/GraphDebugger';
import { NodeSignal } from '../engines/core/NodeSignal';
import { NodeType } from '../engines/core/NodeType';
import type { BaseEngine, EngineTypes } from '../engines/core/types/BaseEngine';
import { EngineFactory } from '../engines/EngineFactory';
import { CycleManager } from './cycle/CycleManager';
import { containsNode } from './cycle/utils';
import { GraphNode } from './GraphNode';
import type { IGraphListener } from './IGraphListener';
import { NodeStateUpdater } from './NodeStateUpdater';
import { PathManager } from './path/PathManager';
import type { GraphPath } from './path/types';

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
    // public readonly breakpoints: Set<GraphNode> = new Set();

    private readonly cycleManager: CycleManager;
    public readonly pathManager: PathManager = new PathManager(this);
    public readonly debugger: GraphDebugger = new GraphDebugger(this);

    private readonly eventDispatcher: EventDispatcher<IGraphListener> =
        new EventDispatcher();

    private _engine!: BaseEngine<EngineTypes>;

    public get engine(): BaseEngine<EngineTypes> {
        return this._engine;
    }

    public set engine(newEngine: BaseEngine<EngineTypes>) {
        this._engine = newEngine;
        if (this.eventDispatcher && this.cycleManager && this.pathManager) {
            this.updateEngineSubscriptions();
        }
    }

    private updateEngineSubscriptions(): void {
        this.eventDispatcher.unsubscribe(this.cycleManager);
        this.eventDispatcher.unsubscribe(this.pathManager);

        if (this._engine.capabilities.supportCycles) {
            this.eventDispatcher.subscribe(this.cycleManager);
        }
        if (this._engine.capabilities.supportPathes) {
            this.eventDispatcher.subscribe(this.pathManager);
        }
    }

    public updater: NodeStateUpdater;

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

        this.engine = EngineFactory.create(this, this.gameMap);
        this.engine.reset();

        this.cycleManager = new CycleManager(
            this,
            this._engine.capabilities.canWriteAndClear,
        );

        this.eventDispatcher.subscribe(this.debugger);
        this.updateEngineSubscriptions();

        this.updater = new NodeStateUpdater(this);

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
        const cycles = this.cycles;
        const cyclesLen = cycles.length;

        for (let i = 0; i < cyclesLen; i++) {
            const cycle = cycles[i];
            if (cycle === null) continue;

            const nodes = cycle.nodes;
            const nodesLen = nodes.length;
            for (let j = 0; j < nodesLen; j++) {
                this.engine.makeDirtyChunk(nodes[j].chunkIdx);
            }
        }
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
        const oldTargets: GraphNode[] = [];
        const currentLinks = node.linksList.nodes;
        const currentCounts = node.linksList.counts;
        const linksLen = currentLinks.length;

        for (let i = 0; i < linksLen; i++) {
            const n = currentLinks[i];
            if (n.detectedLink !== node || currentCounts[i] > 1) {
                oldTargets.push(n);
            }
        }

        const relations = getArrowRelations(node.arrowType);
        const relationsLen = relations.length;
        const newTargets = new Array<GraphNode>(relationsLen);
        const chunk = this.privateGameMap.getOrCreateChunkByArrowCoordinates(
            node.globalX,
            node.globalY,
        );

        for (let i = 0; i < relationsLen; i++) {
            const [relX, relY] = relations[i];

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

            newTargets[i] = relNode;
        }

        const oldTargetsLen = oldTargets.length;
        for (let i = 0; i < oldTargetsLen; i++) {
            const oldTarget = oldTargets[i];
            if (!containsNode(newTargets, oldTarget)) {
                this.removeNodeLink(node, oldTarget, true);
            }
        }

        for (let i = 0; i < relationsLen; i++) {
            const newTarget = newTargets[i];
            if (!containsNode(oldTargets, newTarget)) {
                this.addNodeLink(node, newTarget, true);
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
            this.syncBreakpointState(node);
            this.syncBreakpointState(blockedLink);
            this.updater.update(node);
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

        const backNodes = node.backLinksList.nodes;
        const backNodesLen = backNodes.length;
        for (let i = 0; i < backNodesLen; i++) {
            const backNode = backNodes[i];
            if (
                backNode.type === NodeType.DETECTOR &&
                backNode.detectedLink === node
            ) {
                this.updater.update(backNode);
            }
        }
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
            this.eventDispatcher.dispatch(
                'onChunkAdded',
                this,
                chunk,
                chunkIdx,
            );
            this.engine.ensureChunkCapacity(chunkIdx + 1);
            this.engine.registerChunk?.(chunkIdx, chunk.x, chunk.y);
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
        this.updater.update(node);

        this.eventDispatcher.dispatch('onNodeAdded', this, node);

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

        return this.getOrCreateNode(arrow, chunk, globalX, globalY);
    }

    public clear() {
        EnableBreakpointSetting.onChange.remove(this.handleBreakpointChange);
        EnableSnapshotsSetting.onChange.remove(this.handleSnapshotsChange);

        this.nodes.length = 0;
        this.chunks.length = 0;
        this.cycles.length = 0;
        this.freeCycleIndices.length = 0;
        this.engine.clear();
        this.eventDispatcher.dispatch('onGraphClear', this);
        this.eventDispatcher.clear();
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

    private mutateNode(
        node: GraphNode,
        isTypeChange: boolean,
        applyMutation: () => void,
    ): void {
        const oldType = node.type;

        if (isTypeChange && !this.updater.isLoading) {
            this.engine.setNodeSignal(node.nodeIdx, NodeSignal.NONE);
        }

        applyMutation();
        this.updateNodeRelations(node);

        if (
            (isTypeChange && oldType !== node.type) ||
            node.type === NodeType.DETECTOR
        ) {
            this.eventDispatcher.dispatch('onNodeTypeChanged', this, node);

            const backNodes = node.backLinksList.nodes;
            const backLen = backNodes.length;
            for (let i = 0; i < backLen; i++) {
                this.syncBreakpointState(backNodes[i]);
                this.updater.update(backNodes[i]);
            }
        }

        this.updater.update(node);

        this._lastUpdate = Date.now();
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
        ) {
            return;
        }

        this.mutateNode(node, node.arrowType !== type, () => {
            node.updateState(type, rotation, flipped);
        });
    }

    private setNodeType(node: GraphNode, type: ArrowType) {
        if (node.arrowType === type) return;

        this.mutateNode(node, true, () => {
            node.setType(type);
        });
    }

    private setNodeRotation(node: GraphNode, rotation: number) {
        if (node.rotation === rotation) return;

        this.mutateNode(node, false, () => {
            node.setRotation(rotation);
        });
    }

    private setNodeFlipped(node: GraphNode, flipped: boolean) {
        if (node.flipped === flipped) return;

        this.mutateNode(node, false, () => {
            node.setFlipped(flipped);
        });
    }

    private addNodeLink(
        fromNode: GraphNode,
        toNode: GraphNode,
        updateState = true,
    ) {
        fromNode.addLink(toNode);
        this.eventDispatcher.dispatch('onLinkAdded', this, fromNode, toNode);
        if (updateState) {
            this.updater.update(fromNode);
            this.updater.update(toNode);
        }
        this._lastUpdate = Date.now();
    }

    private removeNodeLink(
        fromNode: GraphNode,
        toNode: GraphNode,
        updateState = true,
    ) {
        fromNode.removeLink(toNode);
        this.eventDispatcher.dispatch('onLinkRemoved', this, fromNode, toNode);
        if (updateState) {
            this.updater.update(fromNode);
            this.updater.update(toNode);
        }
        this._lastUpdate = Date.now();
    }

    private syncBreakpointState(node: GraphNode | null) {
        if (!node) return;

        const isBreakpoint =
            node.type === NodeType.BLOCKER &&
            node.blockedLink !== null &&
            node.blockedLink.type === NodeType.BLOCKER &&
            node.blockedLink.blockedLink === node;

        if (node.isBreakpoint !== isBreakpoint) {
            node.isBreakpoint = isBreakpoint;

            // if (isBp) {
            //     this.breakpoints.add(node);
            // } else {
            //     this.breakpoints.delete(node);
            // }

            this.updater.updateBreakpoint(node);
        }
    }

    public addCycle(nodes: GraphNode[], heads?: HeadData[]): GraphCycle {
        const nodesToDismantle = new Set<GraphNode>();
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].path !== null) {
                nodesToDismantle.add(nodes[i]);
            }
        }
        if (heads) {
            for (let i = 0; i < heads.length; i++) {
                if (heads[i].node.path !== null) {
                    nodesToDismantle.add(heads[i].node);
                }
                const extra = heads[i].extraPath;
                if (extra) {
                    for (let j = 0; j < extra.length; j++) {
                        if (extra[j].path !== null) {
                            nodesToDismantle.add(extra[j]);
                        }
                    }
                }
            }
        }
        for (const n of nodesToDismantle) {
            if (n.path !== null) {
                this.pathManager.dismantlePath(n.path.ref);
            }
        }

        const index = this.allocateCycleIndex();

        const cycle: GraphCycle = {
            index,
            nodes,
            heads: [],
            extraNodes: [],
        };
        this.cycles[index] = cycle;

        this.cycleManager.attachNodesToCycle(cycle, nodes, heads);
        this.syncNodesAndHeadsState(cycle.nodes, cycle.heads, cycle.extraNodes);

        this.engine.addCycle(cycle);
        this.eventDispatcher.dispatch('onCycleAdded', this, cycle);

        return cycle;
    }

    public flushCycles(): void {
        if (this._engine.capabilities.supportCycles) {
            this.cycleManager.flushSync();
        }
        if (this._engine.capabilities.supportPathes) {
            this.pathManager.flushSync();
        }
    }

    public flushPaths(): void {
        if (this._engine.capabilities.supportPathes) {
            this.pathManager.flushSync();
        }
    }

    public addPath(path: GraphPath): void {
        this.engine.addPath(path);
        this.eventDispatcher.dispatch('onPathAdded', this, path);
    }

    public removePath(path: GraphPath): void {
        this.engine.removePath(path);
        this.eventDispatcher.dispatch('onPathRemoved', this, path);
    }

    public getPaths(): readonly GraphPath[] {
        return this.pathManager.getPaths();
    }

    public getCycles(): (GraphCycle | null)[] {
        return this.cycles;
    }

    public removeCycle(cycle: GraphCycle) {
        this.engine.removeCycle(cycle);

        this.cycleManager.detachNodesFromCycle(cycle);

        this.syncNodesAndHeadsState(cycle.nodes, cycle.heads, cycle.extraNodes);

        this.reclaimCycleIndex(cycle.index);

        this.eventDispatcher.dispatch('onCycleRemoved', this, cycle);
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

    private syncNodesAndHeadsState(
        nodes: readonly GraphNode[],
        heads: readonly GraphNode[],
        extraNodes: readonly GraphNode[],
    ) {
        const nodesLen = nodes.length;
        for (let i = 0; i < nodesLen; i++) {
            this.updater.update(nodes[i]);
        }

        const headsLen = heads.length;
        for (let i = 0; i < headsLen; i++) {
            this.updater.update(heads[i]);
        }

        const extraLen = extraNodes.length;
        for (let i = 0; i < extraLen; i++) {
            this.updater.update(extraNodes[i]);
        }
    }
}
