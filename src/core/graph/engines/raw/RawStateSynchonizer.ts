import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import { CycleHeadType, type GraphCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import type { RawGraphState } from './RawState';
import type { RawGraphUpdater } from './RawUpdater';

export class RawStateSynchronizer {
    private readonly updater: RawGraphUpdater;

    public constructor(updater: RawGraphUpdater) {
        this.updater = updater;
    }

    public onCycleBuild(state: RawGraphState, cycle: GraphCycle) {
        state.addCycle(cycle);
        const cycleState = state.cycles[cycle.index];
        if (!cycleState) return;

        for (const node of cycle.nodes) {
            const nodeState = state.getNode(node.nodeIdx);

            if (nodeState.signal === NodeSignal.ACTIVE) {
                cycleState.writeBit(state.tick, node.cycleOffset);
            }

            nodeState.signal = NodeSignal.NONE;
            nodeState.lastSignal = NodeSignal.NONE;
            state.makeDirtyChunk(node.chunkIdx);
        }

        for (const node of cycle.nodes) {
            const nodeState = state.getNode(node.nodeIdx);
            const isHead =
                node.headType !== CycleHeadType.NONE &&
                node.headType !== CycleHeadType.READ;

            if (!isHead) {
                if (nodeState.isChanged) {
                    removeWithSwap(state.changedNodes, nodeState);
                    removeWithSwap(state.tempChangedNodes, nodeState);
                    nodeState.isChanged = false;
                }
            } else {
                this.updater.markNodeAsChangedNonTemp(state, nodeState);
                this.updater.markNodeAsChanged(state, nodeState);
            }
        }

        for (const headNode of cycle.heads) {
            if (headNode.cycleRef === cycle) {
                continue;
            }

            const nodeState = state.getNode(headNode.nodeIdx);
            if (headNode.headType !== CycleHeadType.NONE) {
                this.updater.markNodeAsChangedNonTemp(state, nodeState);
                this.updater.markNodeAsChanged(state, nodeState);
            }
        }

        const affectedNodes = new Set<GraphNode>();
        for (const node of cycle.nodes) {
            affectedNodes.add(node);
            for (const next of node.links) {
                affectedNodes.add(next);
            }
        }
        for (const head of cycle.heads) {
            affectedNodes.add(head);
            for (const next of head.links) {
                affectedNodes.add(next);
            }
        }

        for (const affectedNode of affectedNodes) {
            this.updater.fullNodeStateCalculate(state, affectedNode);
        }
    }

    public onCycleDismantle(state: RawGraphState, cycle: GraphCycle) {
        const cycleState = state.cycles[cycle.index];

        for (const node of cycle.nodes) {
            const nodeState = state.getNode(node.nodeIdx);

            if (cycleState) {
                const isActive = cycleState.getBit(
                    state.tick,
                    node.cycleOffset,
                );

                if (isActive) {
                    nodeState.signal = NodeSignal.ACTIVE;
                    nodeState.lastSignal = nodeState.signal;
                    state.makeDirtyChunk(node.chunkIdx);
                } else {
                    if (nodeState.signal !== NodeSignal.ACTIVE)
                        nodeState.signal = NodeSignal.NONE;
                    nodeState.lastSignal = nodeState.signal;
                    state.makeDirtyChunk(node.chunkIdx);
                }
            }

            nodeState.cycleOffset = 0;
            nodeState.isUpdated = true;

            this.updater.markNodeAsChangedNonTemp(state, nodeState);
            this.updater.markNodeAsChanged(state, nodeState);
        }

        const affectedNodes = new Set<GraphNode>();
        for (const node of cycle.nodes) {
            affectedNodes.add(node);
            for (const next of node.links) {
                affectedNodes.add(next);
            }
        }
        for (const head of cycle.heads) {
            affectedNodes.add(head);
            for (const next of head.links) {
                affectedNodes.add(next);
            }
        }

        for (const affectedNode of affectedNodes) {
            this.updater.fullNodeStateCalculate(state, affectedNode);
        }
        state.removeCycle(cycle);
    }

    public updateNodeChange(
        state: RawGraphState,
        node: GraphNode,
        oldLinks: GraphNode[],
        newLinks: GraphNode[],
    ) {
        const allNodes = new Set([...oldLinks, ...newLinks]);

        this.updater.fullNodeStateCalculate(state, node);
        for (const edgeNode of allNodes) {
            this.updater.fullNodeStateCalculate(state, edgeNode);
        }
    }
}
