import {
    CycleHeadType,
    type GraphCycle,
} from 'src/core/graph/ast/cycle/CycleTypes';
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

    public onCycleBuild(state: SoAGraphState, cycle: GraphCycle): void {
        state.addCycle(cycle);
        const cycleState = state.cycles[cycle.index];
        if (!cycleState) return;

        const nodeStorage = state.storage;
        const nodeData = nodeStorage.nodeData;

        for (let i = 0; i < cycle.nodes.length; i++) {
            const node = cycle.nodes[i];
            const nodeOffset = nodeStorage.inlineNodeOffset(node.nodeIdx);

            if (
                nodeData[nodeOffset + SoALayout.Node.SIGNAL] ===
                NodeSignal.ACTIVE
            ) {
                cycleState.writeBit(state.tick, node.cycleOffset);
            }

            nodeData[nodeOffset + SoALayout.Node.SIGNAL] = NodeSignal.NONE;
            nodeData[nodeOffset + SoALayout.Node.LAST_SIGNAL] = NodeSignal.NONE;
            state.makeDirtyChunk(node.chunkIdx);
        }

        for (let i = 0; i < cycle.nodes.length; i++) {
            const node = cycle.nodes[i];
            const nodeIdx = node.nodeIdx;
            const nodeOffset = nodeStorage.inlineNodeOffset(nodeIdx);
            const flagsOffset = nodeOffset + SoALayout.Node.FLAGS;

            const isHead =
                node.headType !== CycleHeadType.NONE &&
                node.headType !== CycleHeadType.READ;

            if (!isHead) {
                const isChanged =
                    (nodeData[flagsOffset] & SoALayout.Node.Flags.IsChanged) !==
                    0;
                if (isChanged) {
                    state.changedNodes.removeElement(nodeIdx);
                    state.tempChangedNodes.removeElement(nodeIdx);
                    nodeData[flagsOffset] &= ~SoALayout.Node.Flags.IsChanged;
                }
            } else {
                this.updater.markNodeAsChangedNonTemp(state, nodeIdx);
                this.updater.markNodeAsChanged(state, nodeIdx);
            }
        }

        for (let i = 0; i < cycle.heads.length; i++) {
            const headNode = cycle.heads[i];
            if (headNode.cycleRef === cycle) continue;

            if (headNode.headType !== CycleHeadType.NONE) {
                this.updater.markNodeAsChangedNonTemp(state, headNode.nodeIdx);
                this.updater.markNodeAsChanged(state, headNode.nodeIdx);
            }
        }

        this.recalculateCycleAffectedNodes(state, cycle);
    }

    public onCycleDismantle(state: SoAGraphState, cycle: GraphCycle): void {
        const cycleState = state.cycles[cycle.index];
        const nodeStorage = state.storage;
        const nodeData = nodeStorage.nodeData;
        const extra32Data = nodeStorage.extra32NodeData;

        for (let i = 0; i < cycle.nodes.length; i++) {
            const node = cycle.nodes[i];
            const nodeIdx = node.nodeIdx;
            const nodeOffset = nodeStorage.inlineNodeOffset(nodeIdx);
            const extra32Offset = nodeStorage.inlineExtra32Offset(nodeIdx);

            const signalOffset = nodeOffset + SoALayout.Node.SIGNAL;
            const lastSignalOffset = nodeOffset + SoALayout.Node.LAST_SIGNAL;
            const flagsOffset = nodeOffset + SoALayout.Node.FLAGS;
            const cycleOffsetOffset =
                extra32Offset + SoALayout.Extra32Node.CYCLE_OFFSET;

            if (cycleState) {
                const isActive = cycleState.getBit(
                    state.tick,
                    node.cycleOffset,
                );

                if (isActive) {
                    nodeData[signalOffset] = NodeSignal.ACTIVE;
                    nodeData[lastSignalOffset] = NodeSignal.ACTIVE;
                } else {
                    if (nodeData[signalOffset] !== NodeSignal.ACTIVE) {
                        nodeData[signalOffset] = NodeSignal.NONE;
                    }
                    nodeData[lastSignalOffset] = nodeData[signalOffset];
                }
                state.makeDirtyChunk(node.chunkIdx);
            }

            extra32Data[cycleOffsetOffset] = 0;
            nodeData[flagsOffset] |= SoALayout.Node.Flags.IsUpdated;

            this.updater.markNodeAsChangedNonTemp(state, nodeIdx);
            this.updater.markNodeAsChanged(state, nodeIdx);
        }

        this.recalculateCycleAffectedNodes(state, cycle);
        state.removeCycle(cycle);
    }

    public updateNodeChange(
        state: SoAGraphState,
        node: GraphNode,
        oldLinks: GraphNode[],
        newLinks: GraphNode[],
    ): void {
        this.updater.fullNodeStateCalculate(state, node);

        const allNodes = new Set<GraphNode>();
        for (let i = 0; i < oldLinks.length; i++) {
            allNodes.add(oldLinks[i]);
        }
        for (let i = 0; i < newLinks.length; i++) {
            allNodes.add(newLinks[i]);
        }

        for (const edgeNode of allNodes) {
            this.updater.fullNodeStateCalculate(state, edgeNode);
        }
    }

    private recalculateCycleAffectedNodes(
        state: SoAGraphState,
        cycle: GraphCycle,
    ): void {
        const affectedNodes = new Set<GraphNode>();

        for (let i = 0; i < cycle.nodes.length; i++) {
            const node = cycle.nodes[i];
            affectedNodes.add(node);
            for (let j = 0; j < node.links.length; j++) {
                affectedNodes.add(node.links[j]);
            }
        }

        for (let i = 0; i < cycle.heads.length; i++) {
            const head = cycle.heads[i];
            affectedNodes.add(head);
            for (let j = 0; j < head.links.length; j++) {
                affectedNodes.add(head.links[j]);
            }
        }

        for (const affectedNode of affectedNodes) {
            this.updater.fullNodeStateCalculate(state, affectedNode);
        }
    }
}
