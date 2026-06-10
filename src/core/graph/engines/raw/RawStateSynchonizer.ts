import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import { CycleHeadType, type RawCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import type { RawGraphState } from './RawState';
import type { RawGraphUpdater } from './RawUpdater';

export class RawStateSynchronizer {
    private readonly updater: RawGraphUpdater;

    public constructor(updater: RawGraphUpdater) {
        this.updater = updater;
    }

    public onCycleBuild(graphState: RawGraphState, cycle: RawCycle) {
        graphState.addCycle(cycle);
        const cycleState = graphState.cycles[cycle.index];
        if (!cycleState) return;

        for (const node of cycle.nodes) {
            const nodeState = graphState.getNode(node.nodeIdx);

            if (nodeState.signal === NodeSignal.ACTIVE) {
                cycleState.writeBit(graphState.tick, node.origCycleOffset);
            }

            nodeState.signal = NodeSignal.NONE;
            nodeState.lastSignal = NodeSignal.NONE;
            graphState.makeDirtyChunk(node.chunkIdx);
        }

        for (const node of cycle.nodes) {
            const nodeState = graphState.getNode(node.nodeIdx);
            const isHead =
                node.headType !== CycleHeadType.NONE &&
                node.headType !== CycleHeadType.READ;

            if (!isHead) {
                if (nodeState.isChanged) {
                    removeWithSwap(graphState.changedNodes, nodeState);
                    removeWithSwap(graphState.tempChangedNodes, nodeState);
                    nodeState.isChanged = false;
                }
            } else {
                this.updater.markNodeAsChangedNonTemp(graphState, nodeState);
                this.updater.markNodeAsChanged(graphState, nodeState);
            }
        }

        for (const headNode of cycle.heads) {
            if (headNode.cycleRef === cycle) {
                continue;
            }

            const nodeState = graphState.getNode(headNode.nodeIdx);
            if (headNode.headType !== CycleHeadType.NONE) {
                this.updater.markNodeAsChangedNonTemp(graphState, nodeState);
                this.updater.markNodeAsChanged(graphState, nodeState);
            }
        }

        const affectedNodes = new Set<GraphNode>();
        for (const node of cycle.nodes) {
            affectedNodes.add(node);
            for (const next of node.next) {
                affectedNodes.add(next);
            }
        }
        for (const head of cycle.heads) {
            affectedNodes.add(head);
            for (const next of head.next) {
                affectedNodes.add(next);
            }
        }

        for (const affectedNode of affectedNodes) {
            this.updater.fullNodeStateCalculate(graphState, affectedNode);
        }
    }

    public onCycleDismantle(graphState: RawGraphState, cycle: RawCycle) {
        const cycleState = graphState.cycles[cycle.index];

        for (const node of cycle.nodes) {
            const nodeState = graphState.getNode(node.nodeIdx);

            if (cycleState) {
                const isActive = cycleState.getBit(
                    graphState.tick,
                    node.origCycleOffset,
                );

                if (isActive) {
                    nodeState.signal = NodeSignal.ACTIVE;
                    nodeState.lastSignal = nodeState.signal;
                    graphState.makeDirtyChunk(node.chunkIdx);
                } else {
                    if (nodeState.signal !== NodeSignal.ACTIVE)
                        nodeState.signal = NodeSignal.NONE;
                    nodeState.lastSignal = nodeState.signal;
                    graphState.makeDirtyChunk(node.chunkIdx);
                }
            }

            nodeState.nodeInCycleOffset = 0;
            nodeState.isUpdated = true;

            this.updater.markNodeAsChangedNonTemp(graphState, nodeState);
            this.updater.markNodeAsChanged(graphState, nodeState);
        }

        const affectedNodes = new Set<GraphNode>();
        for (const node of cycle.nodes) {
            affectedNodes.add(node);
            for (const next of node.next) {
                affectedNodes.add(next);
            }
        }
        for (const head of cycle.heads) {
            affectedNodes.add(head);
            for (const next of head.next) {
                affectedNodes.add(next);
            }
        }

        for (const affectedNode of affectedNodes) {
            this.updater.fullNodeStateCalculate(graphState, affectedNode);
        }
        graphState.removeCycle(cycle);
    }

    public updateNodeChange(
        graphState: RawGraphState,
        node: GraphNode,
        oldNext: GraphNode[],
        newNext: GraphNode[],
    ) {
        const allNodes = new Set([...oldNext, ...newNext]);

        this.updater.fullNodeStateCalculate(graphState, node);
        for (const edgeNode of allNodes) {
            this.updater.fullNodeStateCalculate(graphState, edgeNode);
        }
    }
}
