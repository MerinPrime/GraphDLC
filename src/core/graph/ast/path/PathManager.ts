import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { GraphCycle } from 'src/core/graph/ast/cycle/types';
import { NodeType } from '../../engines/core/NodeType';
import type { Graph } from '../Graph';
import type { GraphNode } from '../GraphNode';
import type { IGraphListener } from '../IGraphListener';
import type { GraphPath, PathTarget } from './types';

const MIN_PATH_NODES = 3;
const MAX_PATH_DISTANCE = 1000;

export class PathManager implements IGraphListener {
    private readonly paths = new Map<number, GraphPath>();
    private readonly dirtyNodes = new Set<GraphNode>();
    private flushQueued = false;
    private nextPathId = 1;

    private visitedEpoch: Uint32Array = new Uint32Array(1024);
    private processedEpoch: Uint32Array = new Uint32Array(1024);
    private nodeDists: Uint16Array = new Uint16Array(1024);
    private currentEpoch = 0;
    private currentFlushEpoch = 0;

    public constructor(private readonly graph: Graph) {}

    private ensureCapacity(nodeIdx: number): void {
        if (nodeIdx >= this.visitedEpoch.length) {
            const newCap = Math.max(nodeIdx + 1, this.visitedEpoch.length * 2);
            const newVisited = new Uint32Array(newCap);
            newVisited.set(this.visitedEpoch);
            this.visitedEpoch = newVisited;

            const newProcessed = new Uint32Array(newCap);
            newProcessed.set(this.processedEpoch);
            this.processedEpoch = newProcessed;

            const newDists = new Uint16Array(newCap);
            newDists.set(this.nodeDists);
            this.nodeDists = newDists;
        }
    }

    public getPaths(): readonly GraphPath[] {
        return Array.from(this.paths.values());
    }

    public getPath(id: number): GraphPath | undefined {
        return this.paths.get(id);
    }

    public isPathCandidate(node: GraphNode): boolean {
        if (node.type !== NodeType.PATH) return false;
        if (node.cycle !== null) return false;
        if (node.isBreakpoint) return false;

        if (node.backLinks.length !== 1) return false;
        if (node.links.length === 0) return false;

        const b = node.backLinks[0];
        if (b.type === NodeType.EMPTY) return false;
        if (b.path !== null) return false;
        if (b.type === NodeType.BLOCKER && b.blockedLink === node) {
            return false;
        }

        let hasValidLink = false;
        for (let i = 0; i < node.links.length; i++) {
            const link = node.links[i];
            if (link.type === NodeType.DETECTOR) {
                return false;
            }
            if (link.type !== NodeType.EMPTY) {
                hasValidLink = true;
            }
        }

        return hasValidLink;
    }

    public markNodeDirty(node: GraphNode): void {
        this.dirtyNodes.add(node);

        this.invalidateNodePath(node);

        for (let i = 0; i < node.links.length; i++) {
            const link = node.links[i];
            this.dirtyNodes.add(link);
            this.invalidateNodePath(link);
        }

        for (let i = 0; i < node.backLinks.length; i++) {
            const back = node.backLinks[i];
            this.dirtyNodes.add(back);
            this.invalidateNodePath(back);
        }

        this.scheduleFlush();
    }

    private invalidateNodePath(node: GraphNode): void {
        if (node.path !== null) {
            this.dismantlePath(node.path.ref);
            return;
        }

        let curr = node;
        let hops = 0;
        while (
            curr.path === null &&
            curr.backLinks.length === 1 &&
            hops < 250
        ) {
            const back = curr.backLinks[0];
            if (back.type !== NodeType.PATH && back.type !== NodeType.EMPTY)
                break;
            curr = back;
            hops++;
            this.dirtyNodes.add(curr);
            if (curr.path !== null) {
                this.dismantlePath(curr.path.ref);
                break;
            }
        }
    }

    public dismantlePath(path: GraphPath): void {
        if (!this.paths.has(path.index)) return;

        this.paths.delete(path.index);

        this.graph.removePath(path);

        for (let i = 0; i < path.nodes.length; i++) {
            const n = path.nodes[i];
            n.path = null;
            this.dirtyNodes.add(n);
        }

        if (path.sourceNode.type !== NodeType.EMPTY) {
            this.dirtyNodes.add(path.sourceNode);
        }

        for (let i = 0; i < path.targets.length; i++) {
            const t = path.targets[i].node;
            if (t.type !== NodeType.EMPTY) {
                this.dirtyNodes.add(t);
            }
        }
    }

    private scheduleFlush(): void {
        if (this.flushQueued) return;
        this.flushQueued = true;
        queueMicrotask(() => {
            this.flushQueued = false;
            this.flushSync();
        });
    }

    public flushSync(): void {
        if (this.dirtyNodes.size === 0) return;

        const nodesToProcess = Array.from(this.dirtyNodes);
        this.dirtyNodes.clear();

        this.ensureCapacity(this.graph.getNodes().length);
        const flushEpoch = ++this.currentFlushEpoch;

        for (let i = 0; i < nodesToProcess.length; i++) {
            const node = nodesToProcess[i];
            if (node.path !== null) continue;
            if (this.processedEpoch[node.nodeIdx] === flushEpoch) continue;
            if (!this.isPathCandidate(node)) continue;

            this.tryBuildPathFromNode(node, flushEpoch);
        }
    }

    private tryBuildPathFromNode(
        startNode: GraphNode,
        flushEpoch: number,
    ): void {
        let curr = startNode;
        const backEpoch = ++this.currentEpoch;

        while (
            curr.backLinks.length === 1 &&
            this.isPathCandidate(curr.backLinks[0])
        ) {
            if (this.visitedEpoch[curr.nodeIdx] === backEpoch) return;
            this.visitedEpoch[curr.nodeIdx] = backEpoch;
            this.processedEpoch[curr.nodeIdx] = flushEpoch;
            curr = curr.backLinks[0];
        }

        this.visitedEpoch[curr.nodeIdx] = backEpoch;
        this.processedEpoch[curr.nodeIdx] = flushEpoch;

        const sourceNode = curr.backLinks[0];
        if (!sourceNode) return;
        if (sourceNode.type === NodeType.EMPTY) return;
        if (sourceNode.cycle !== null) return;

        const entryNode = curr;
        if (entryNode.path !== null) return;

        const pathNodes: GraphNode[] = [];
        const splitters: GraphNode[] = [];
        const targets: PathTarget[] = [];
        const treeEpoch = ++this.currentEpoch;

        const queue: GraphNode[] = [entryNode];
        this.visitedEpoch[entryNode.nodeIdx] = treeEpoch;
        this.nodeDists[entryNode.nodeIdx] = 1;
        this.processedEpoch[entryNode.nodeIdx] = flushEpoch;

        let queueHead = 0;
        while (queueHead < queue.length) {
            const n = queue[queueHead++];
            const dist = this.nodeDists[n.nodeIdx];

            pathNodes.push(n);

            if (n.links.length > 1) {
                splitters.push(n);
            }

            for (let j = 0; j < n.links.length; j++) {
                const next = n.links[j];

                if (
                    next.type === NodeType.EMPTY ||
                    next.type === NodeType.DETECTOR
                ) {
                    continue;
                }

                if (dist < MAX_PATH_DISTANCE && this.isPathCandidate(next)) {
                    if (this.visitedEpoch[next.nodeIdx] !== treeEpoch) {
                        this.visitedEpoch[next.nodeIdx] = treeEpoch;
                        this.nodeDists[next.nodeIdx] = dist + 1;
                        this.processedEpoch[next.nodeIdx] = flushEpoch;
                        queue.push(next);
                    }
                } else {
                    const resolved = this.resolveTarget(next, dist, treeEpoch);
                    if (
                        resolved !== null &&
                        resolved.node.type !== NodeType.EMPTY
                    ) {
                        targets.push(resolved);
                    }
                }
            }
        }

        if (pathNodes.length < MIN_PATH_NODES || targets.length === 0) {
            return;
        }

        const pathId = this.nextPathId++;
        const path: GraphPath = {
            index: pathId,
            sourceNode,
            nodes: pathNodes,
            splitters,
            targets,
        };

        for (let i = 0; i < pathNodes.length; i++) {
            const pNode = pathNodes[i];
            const isSplitter = pNode.links.length > 1;

            pNode.path = {
                ref: path,
                distanceFromSource: this.nodeDists[pNode.nodeIdx] || 1,
                isSplitter,
            };
        }

        this.paths.set(path.index, path);
        this.graph.addPath(path);
    }

    private resolveTarget(
        initialTarget: GraphNode,
        initialDelay: number,
        treeEpoch: number,
    ): PathTarget | null {
        if (initialTarget.type === NodeType.EMPTY) {
            return null;
        }

        let curr = initialTarget;
        let delay = initialDelay;

        while (
            curr.type === NodeType.PATH &&
            curr.cycle === null &&
            !curr.isBreakpoint &&
            curr.path === null &&
            curr.links.length === 1 &&
            delay < 250
        ) {
            const nextHop = curr.links[0];
            if (
                nextHop.type === NodeType.EMPTY ||
                nextHop.type === NodeType.DETECTOR
            ) {
                break;
            }
            if (nextHop.path !== null) break;

            let signalBackLinks = 0;
            for (let b = 0; b < curr.backLinks.length; b++) {
                const back = curr.backLinks[b];
                if (
                    back.type === NodeType.EMPTY ||
                    back.type === NodeType.DETECTOR
                ) {
                    continue;
                }
                if (
                    back.type === NodeType.BLOCKER &&
                    back.blockedLink === curr
                ) {
                    continue;
                }
                signalBackLinks++;
            }
            if (signalBackLinks > 1) {
                break;
            }

            if (this.visitedEpoch[nextHop.nodeIdx] === treeEpoch) {
                break;
            }

            let isBlocked = false;
            for (let b = 0; b < curr.backLinks.length; b++) {
                const back = curr.backLinks[b];
                if (
                    back.type === NodeType.BLOCKER &&
                    back.blockedLink === curr
                ) {
                    isBlocked = true;
                    break;
                }
            }
            if (isBlocked) break;

            let hasDetector = false;
            for (let l = 0; l < curr.links.length; l++) {
                if (curr.links[l].type === NodeType.DETECTOR) {
                    hasDetector = true;
                    break;
                }
            }
            if (hasDetector) break;

            curr = nextHop;
            delay++;

            if (curr.type !== NodeType.PATH) {
                break;
            }
        }

        if (curr.type === NodeType.EMPTY) {
            return null;
        }

        return { node: curr, delay };
    }

    public onLinkAdded(
        _graph: Graph,
        fromNode: GraphNode,
        toNode: GraphNode,
    ): void {
        this.markNodeDirty(fromNode);
        this.markNodeDirty(toNode);
    }

    public onLinkRemoved(
        _graph: Graph,
        fromNode: GraphNode,
        toNode: GraphNode,
    ): void {
        this.markNodeDirty(fromNode);
        this.markNodeDirty(toNode);
    }

    public onNodeTypeChanged(_graph: Graph, node: GraphNode): void {
        this.markNodeDirty(node);
    }

    public onCycleAdded(_graph: Graph, cycle: GraphCycle): void {
        for (let i = 0; i < cycle.nodes.length; i++) {
            const n = cycle.nodes[i];
            if (n.path !== null) {
                this.dismantlePath(n.path.ref);
            }
        }
    }

    public onCycleRemoved(_graph: Graph, cycle: GraphCycle): void {
        for (let i = 0; i < cycle.nodes.length; i++) {
            this.dirtyNodes.add(cycle.nodes[i]);
        }
        this.scheduleFlush();
    }

    public onGraphClear(_graph: Graph): void {
        this.paths.clear();
        this.dirtyNodes.clear();
        this.flushQueued = false;
        this.nextPathId = 1;
    }

    public onChunkAdded(
        _graph: Graph,
        _chunk: Chunk,
        _chunkIdx: number,
    ): void {}
    public onNodeAdded(_graph: Graph, _node: GraphNode): void {}
}
