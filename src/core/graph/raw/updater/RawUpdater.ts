import { ArrowType } from 'src/core/utils/ArrowType';
import type { RawNode } from '../RawNode';
import { ArrowSignal } from './ArrowSignal';
import { ACTIVE_SIGNALS } from './ArrowSignals';
import { NodeSignal } from './NodeSignal';
import type { RawGraphState, RawNodeState } from './RawState';

export class RawGraphUpdater {
    updateNodeChange(
        graphState: RawGraphState,
        node: RawNode,
        oldNext: RawNode[],
        newNext: RawNode[],
        oldType: number,
        newType: number,
    ) {
        const nodeState = graphState.nodes[node.index];
        this.markNodeAsChanged(graphState, nodeState);
        nodeState.isUpdated = true;
        if (nodeState.lastSignal !== NodeSignal.ACTIVE) return;

        const oldCounts = new Map<RawNode, number>();
        for (const n of oldNext) oldCounts.set(n, (oldCounts.get(n) || 0) + 1);

        const newCounts = new Map<RawNode, number>();
        for (const n of newNext) newCounts.set(n, (newCounts.get(n) || 0) + 1);

        const allNodes = new Set([...oldNext, ...newNext]);

        for (const edgeNode of allNodes) {
            const oldCount = oldCounts.get(edgeNode) || 0;
            const newCount = newCounts.get(edgeNode) || 0;

            if (oldCount === newCount && oldType === newType) continue;

            const edgeState = graphState.nodes[edgeNode.index];

            if (oldCount > 0) {
                if (oldType === ArrowType.BLOCKER)
                    edgeState.blockedCount -= oldCount;
                else edgeState.signalsCount -= oldCount;
            }

            if (newCount > 0) {
                if (newType === ArrowType.BLOCKER)
                    edgeState.blockedCount += newCount;
                else edgeState.signalsCount += newCount;
            }

            this.markNodeAsChanged(graphState, edgeState);
            edgeState.isUpdated = true;
        }
    }

    updateState(graphState: RawGraphState, tick: number) {
        for (let i = 0; i < graphState.changedNodes.length; i++) {
            const nodeState = graphState.changedNodes[i];
            const isActive = nodeState.signal === NodeSignal.ACTIVE;
            const isChanged = nodeState.lastSignal !== nodeState.signal;
            const nodeType = nodeState.node.arrow.type;
            const isBlocker = nodeType === ArrowType.BLOCKER;

            if (isChanged) {
                const delta = isActive ? 1 : -1;
                const isDelayed =
                    (nodeType === ArrowType.DELAY &&
                        nodeState.signal === NodeSignal.PENDING) ||
                    (!isActive && nodeState.lastSignal === NodeSignal.PENDING);

                const nextNodes = nodeState.node.next
                    .filter((node) => node.arrow.type !== ArrowType.DETECTOR)
                    .map((node) => graphState.nodes[node.index]);
                const detectorNodes = nodeState.node.next
                    .filter(
                        (node) =>
                            node.arrow.type === ArrowType.DETECTOR &&
                            node.detectedNode === nodeState.node,
                    )
                    .map((node) => graphState.nodes[node.index]);

                if (!isDelayed) {
                    for (let i = 0; i < nextNodes.length; i++) {
                        const edgeState = nextNodes[i];

                        if (isBlocker) {
                            edgeState.blockedCount += delta;
                            this.markNodeAsChanged(graphState, edgeState);
                        } else {
                            edgeState.signalsCount += delta;
                            this.markNodeAsChanged(graphState, edgeState);
                        }
                    }
                }

                for (let i = 0; i < detectorNodes.length; i++) {
                    const detectorState = detectorNodes[i];

                    detectorState.signalsCount =
                        nodeState.signal !== NodeSignal.NONE ? 1 : 0;
                    this.markNodeAsChanged(graphState, detectorState);
                }

                nodeState.lastSignal = nodeState.signal;
            }

            if (
                nodeState.isUpdated ||
                (isChanged && nodeState.isAdditionalUpdate) ||
                (tick === 0 && nodeState.isEntryPoint) ||
                (nodeState.signal !== NodeSignal.NONE &&
                    nodeState.signalsCount === 0 &&
                    (nodeType === ArrowType.BUTTON ||
                        nodeType === ArrowType.DIRECTIONAL_BUTTON)) ||
                (nodeState.signalsCount > 0 && nodeType === ArrowType.RANDOM)
            ) {
                nodeState.isUpdated = false;
                this.markNodeAsChanged(graphState, nodeState);
            }
        }

        const temp = graphState.changedNodes;
        graphState.changedNodes = graphState.tempChangedNodes;
        graphState.tempChangedNodes = temp;

        for (let i = 0; i < graphState.changedNodes.length; i++) {
            const nodeState = graphState.changedNodes[i];
            nodeState.isChanged = false;

            if (nodeState.blockedCount > 0) nodeState.signal = NodeSignal.NONE;
            else {
                const signal = this.updateNode(nodeState);
                if (signal !== NodeSignal.KEEP_SIGNAL)
                    nodeState.signal = signal;
            }
            nodeState.node.arrow.signal =
                nodeState.signal === NodeSignal.NONE
                    ? 0
                    : nodeState.signal === NodeSignal.PENDING
                      ? ArrowSignal.BLUE
                      : ACTIVE_SIGNALS[nodeState.node.arrow.type];
            nodeState.node.chunk.markRenderDirty();
        }

        graphState.tempChangedNodes.length = 0;
    }

    markNodeAsChanged(graphState: RawGraphState, nodeState: RawNodeState) {
        if (nodeState.isChanged || !nodeState.node.valid) return;
        nodeState.isChanged = true;
        graphState.tempChangedNodes.push(nodeState);
    }

    updateNode(nodeState: RawNodeState): NodeSignal {
        switch (nodeState.node.arrow.type) {
            case ArrowType.ARROW:
            case ArrowType.SPLITTER_UP_DOWN:
            case ArrowType.SPLITTER_UP_RIGHT:
            case ArrowType.SPLITTER_UP_RIGHT_LEFT:
            case ArrowType.BLUE_ARROW:
            case ArrowType.DIAGONAL_ARROW:
            case ArrowType.SPLITTER_UP_UP:
            case ArrowType.SPLITTER_RIGHT_UP:
            case ArrowType.SPLITTER_UP_DIAGONAL:
            case ArrowType.LEVEL_SOURCE:
            case ArrowType.LEVEL_TARGET:
            case ArrowType.BLOCKER:
            case ArrowType.DETECTOR:
            case ArrowType.DIRECTIONAL_BUTTON:
                return nodeState.signalsCount > 0
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case ArrowType.SOURCE:
                return NodeSignal.ACTIVE;
            case ArrowType.DELAY:
                if (nodeState.signal === NodeSignal.PENDING) {
                    return NodeSignal.ACTIVE;
                } else if (nodeState.signalsCount > 0) {
                    if (nodeState.signal === NodeSignal.NONE) {
                        return NodeSignal.PENDING;
                    }
                } else {
                    return NodeSignal.NONE;
                }
                return NodeSignal.KEEP_SIGNAL;
            case ArrowType.IMPULSE:
                if (nodeState.signal === NodeSignal.NONE)
                    return NodeSignal.ACTIVE;
                return NodeSignal.PENDING;
            case ArrowType.LOGIC_NOT:
                return nodeState.signalsCount === 0
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case ArrowType.LOGIC_AND:
                return nodeState.signalsCount > 1
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case ArrowType.LOGIC_XOR:
                return nodeState.signalsCount % 2 === 1
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case ArrowType.LATCH:
                if (nodeState.signalsCount > 1) return NodeSignal.ACTIVE;
                else if (nodeState.signalsCount === 1) return NodeSignal.NONE;
                return NodeSignal.KEEP_SIGNAL;
            case ArrowType.FLIP_FLOP:
                if (nodeState.signalsCount > 0) {
                    if (nodeState.signal === NodeSignal.ACTIVE) {
                        return NodeSignal.NONE;
                    } else {
                        return NodeSignal.ACTIVE;
                    }
                }
                return NodeSignal.KEEP_SIGNAL;
            case ArrowType.RANDOM:
                return nodeState.signalsCount > 0 && Math.random() > 0.5
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case ArrowType.BUTTON:
                return NodeSignal.NONE;
            default:
                return NodeSignal.NONE;
        }
    }
}
