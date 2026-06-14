import type { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import type { ITask } from 'src/core/task/ITask';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeType, NodeTypes } from '../../engines/core/NodeType';
import { DebuggerMode } from '../DebuggerMode';
import type { DebugColor, INodeDebugData } from '../types';

export interface DeadNodeDebugData extends INodeDebugData {
    isReachable: boolean;
}

export class DeadNodeDebuggerMode extends DebuggerMode<DeadNodeDebugData> {
    public constructor(asyncScheduler: AsyncScheduler) {
        super(asyncScheduler, () => ({
            isReachable: false,
        }));
    }

    protected doRunTask(
        _graph: Graph,
        _node: GraphNode,
        _nodeData: DeadNodeDebugData,
    ): boolean {
        return true;
    }

    protected runUpdateTask(
        graph: Graph,
        _node: GraphNode,
        _nodeData: DeadNodeDebugData,
    ): [task: ITask<void>, doReset: boolean, customKey: any] {
        return [new DeadNodeUpdateTask(graph, this), true, 'dead-nodes'];
    }

    public setChunkColor(
        chunkIdx: number,
        localX: number,
        localY: number,
        color: DebugColor,
    ): void {
        this.getDebugChunk(chunkIdx).setColor(localX, localY, color);
    }
}

class DeadNodeUpdateTask implements ITask<void> {
    private static readonly OFF_COLOR: DebugColor = [0, 0, 0, 0];
    private static readonly DEAD_COLOR: DebugColor = [0, 0, 0, 0.3];

    public isCanceled: boolean = false;
    public stepBatchSize?: number = 50;

    private readonly graph: Graph;
    private readonly mode: DeadNodeDebuggerMode;

    private phase = 0;

    private readonly visited: boolean[] = [];

    private readonly reachQueue: GraphNode[] = [];
    private reachHead = 0;

    private initIndex = 0;
    private applyIndex = 0;

    public constructor(graph: Graph, mode: DeadNodeDebuggerMode) {
        this.graph = graph;
        this.mode = mode;
        this.visited = [];
    }

    public step(batchSize: number): boolean {
        if (this.isCanceled) return true;

        let stepsRemaining = batchSize;

        while (stepsRemaining > 0) {
            switch (this.phase) {
                case 0: {
                    const allNodes = this.graph.getNodes();
                    const len = allNodes.length;

                    if (this.initIndex >= len) {
                        this.phase = 1;
                        break;
                    }

                    const limit = Math.min(
                        this.initIndex + stepsRemaining,
                        len,
                    );
                    stepsRemaining -= limit - this.initIndex;

                    for (let i = this.initIndex; i < limit; i++) {
                        const node = allNodes[i];
                        if (NodeTypes.isEntryPoint(node.type)) {
                            if (node.type === NodeType.DETECTOR) {
                                if (
                                    node.detectedLink !== null &&
                                    this.visited[node.detectedLink.nodeIdx] ===
                                        true
                                ) {
                                    this.visited[node.nodeIdx] = true;
                                    this.reachQueue.push(node);
                                }
                            } else {
                                this.visited[node.nodeIdx] = true;
                                this.reachQueue.push(node);
                            }
                        }
                    }

                    this.initIndex = limit;
                    break;
                }

                case 1: {
                    if (this.reachHead >= this.reachQueue.length) {
                        this.phase = 2;
                        break;
                    }

                    const current = this.reachQueue[this.reachHead++];
                    stepsRemaining--;

                    const links = current.links;
                    const len = links.length;
                    for (let i = 0; i < len; i++) {
                        const linkedNode = links[i];

                        if (
                            linkedNode.type === NodeType.EMPTY ||
                            this.visited[linkedNode.nodeIdx] === true
                        ) {
                            continue;
                        }

                        if (linkedNode.type === NodeType.DETECTOR) {
                            if (
                                linkedNode.detectedLink === null ||
                                this.visited[
                                    linkedNode.detectedLink.nodeIdx
                                ] !== true
                            ) {
                                continue;
                            }
                        }

                        const isLogicGate =
                            linkedNode.type === NodeType.LOGIC_AND ||
                            linkedNode.type === NodeType.LATCH;

                        if (isLogicGate) {
                            const backLinks = linkedNode.backLinks;
                            const bLen = backLinks.length;
                            let reachableUniqueParents = 0;

                            for (let j = 0; j < bLen; j++) {
                                const parent = backLinks[j];

                                if (this.visited[parent.nodeIdx] === true) {
                                    let isDuplicate = false;
                                    for (let k = 0; k < j; k++) {
                                        if (
                                            backLinks[k].nodeIdx ===
                                            parent.nodeIdx
                                        ) {
                                            isDuplicate = true;
                                            break;
                                        }
                                    }

                                    if (!isDuplicate) {
                                        reachableUniqueParents++;
                                    }
                                }
                            }

                            if (reachableUniqueParents >= 2) {
                                this.visited[linkedNode.nodeIdx] = true;
                                this.reachQueue.push(linkedNode);
                            }
                        } else {
                            this.visited[linkedNode.nodeIdx] = true;
                            this.reachQueue.push(linkedNode);
                        }
                    }
                    break;
                }

                case 2: {
                    const allNodes = this.graph.getNodes();
                    const len = allNodes.length;

                    if (this.applyIndex >= len) {
                        this.phase = 3;
                        break;
                    }

                    const limit = Math.min(
                        this.applyIndex + stepsRemaining,
                        len,
                    );
                    stepsRemaining -= limit - this.applyIndex;

                    for (let i = this.applyIndex; i < limit; i++) {
                        const node = allNodes[i];
                        const data = this.mode.getNodeData(node.nodeIdx);

                        if (node.type === NodeType.EMPTY) {
                            data.isReachable = false;
                            this.mode.setChunkColor(
                                node.chunkIdx,
                                node.localX,
                                node.localY,
                                DeadNodeUpdateTask.OFF_COLOR,
                            );
                            continue;
                        }

                        const isReachable = this.visited[node.nodeIdx] === true;
                        data.isReachable = isReachable;

                        this.mode.setChunkColor(
                            node.chunkIdx,
                            node.localX,
                            node.localY,
                            isReachable
                                ? DeadNodeUpdateTask.OFF_COLOR
                                : DeadNodeUpdateTask.DEAD_COLOR,
                        );
                    }

                    this.applyIndex = limit;
                    break;
                }

                case 3: {
                    return true;
                }
            }
        }

        return this.phase === 3;
    }

    public getResult(): void {
        return;
    }
}
