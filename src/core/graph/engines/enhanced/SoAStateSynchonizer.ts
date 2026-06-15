import { CycleHeadType, type GraphCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { SoALayout } from './SoALayout';
import type { SoAGraphState } from './SoAState';
import type { SoAGraphUpdater } from './SoAUpdater';

export class SoAStateSynchronizer {
    private readonly updater: SoAGraphUpdater;

    public constructor(updater: SoAGraphUpdater) {
        this.updater = updater;
    }

    public onCycleBuild(state: SoAGraphState, cycle: GraphCycle) {
        state.addCycle(cycle);
        const cycleState = state.cycles[cycle.index];
        if (!cycleState) return;

        for (const node of cycle.nodes) {
            const nodeOffset = node.nodeIdx * SoALayout.Node.STRIDE;

            if (
                state.nodeData[nodeOffset + SoALayout.Node.SIGNAL] ===
                NodeSignal.ACTIVE
            ) {
                cycleState.writeBit(state.tick, node.cycleOffset);
            }

            state.nodeData[nodeOffset + SoALayout.Node.SIGNAL] =
                NodeSignal.NONE;
            state.nodeData[nodeOffset + SoALayout.Node.LAST_SIGNAL] =
                NodeSignal.NONE;
            state.makeDirtyChunk(node.chunkIdx);
        }

        for (const node of cycle.nodes) {
            const nodeState = state.getNode(node.nodeIdx);
            const nodeOffset = node.nodeIdx * SoALayout.Node.STRIDE;
            const isHead =
                node.headType !== CycleHeadType.NONE &&
                node.headType !== CycleHeadType.READ;

            if (!isHead) {
                const isChanged =
                    (state.nodeData[nodeOffset + SoALayout.Node.FLAGS] &
                        SoALayout.Node.Flags.IsChanged) !==
                    0;
                if (isChanged) {
                    state.changedNodes.removeElement(nodeState.nodeIdx);
                    state.tempChangedNodes.removeElement(nodeState.nodeIdx);
                    state.nodeData[nodeOffset + SoALayout.Node.FLAGS] &=
                        ~SoALayout.Node.Flags.IsChanged;
                }
            } else {
                this.updater.markNodeAsChangedNonTemp(state, nodeState.nodeIdx);
                this.updater.markNodeAsChanged(state, nodeState.nodeIdx);
            }
        }

        for (const headNode of cycle.heads) {
            if (headNode.cycleRef === cycle) {
                continue;
            }

            const nodeState = state.getNode(headNode.nodeIdx);
            if (nodeState.headType !== CycleHeadType.NONE) {
                this.updater.markNodeAsChangedNonTemp(state, nodeState.nodeIdx);
                this.updater.markNodeAsChanged(state, nodeState.nodeIdx);
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

    public onCycleDismantle(state: SoAGraphState, cycle: GraphCycle) {
        const cycleState = state.cycles[cycle.index];

        for (const node of cycle.nodes) {
            const nodeState = state.getNode(node.nodeIdx);
            const nodeOffset = nodeState.nodeIdx;
            const signalOffset = nodeOffset + SoALayout.Node.SIGNAL;
            const lastSignalOffset = nodeOffset + SoALayout.Node.LAST_SIGNAL;
            const flagsOffset = nodeOffset + SoALayout.Node.FLAGS;

            if (cycleState) {
                const isActive = cycleState.getBit(
                    state.tick,
                    node.cycleOffset,
                );

                if (isActive) {
                    state.nodeData[signalOffset] = NodeSignal.ACTIVE;
                    state.nodeData[lastSignalOffset] = NodeSignal.ACTIVE;
                    state.makeDirtyChunk(node.chunkIdx);
                } else {
                    if (state.nodeData[signalOffset] !== NodeSignal.ACTIVE) {
                        state.nodeData[signalOffset] = NodeSignal.NONE;
                    }
                    state.nodeData[lastSignalOffset] =
                        state.nodeData[signalOffset];
                    state.makeDirtyChunk(node.chunkIdx);
                }
            }

            nodeState.cycleOffset = 0;
            state.nodeData[flagsOffset] |= SoALayout.Node.Flags.IsUpdated;

            this.updater.markNodeAsChangedNonTemp(state, nodeState.nodeIdx);
            this.updater.markNodeAsChanged(state, nodeState.nodeIdx);
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
        state: SoAGraphState,
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
