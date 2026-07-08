import { CycleHeadType } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { NodeType } from '../core/NodeType';
import type { RawGraphState, RawNodeState } from './RawState';

export class RawGraphUpdater {
    public fullNodeStateCalculate(state: RawGraphState, node: GraphNode) {
        const nodeState = state.getNode(node.nodeIdx);
        if (!nodeState) return;

        let signalsCount = 0;
        let blockedCount = 0;

        const isDetector = node.type === NodeType.DETECTOR;

        if (isDetector) {
            if (node.detectedLink) {
                const detectedState = state.getNode(node.detectedLink.nodeIdx);
                if (detectedState) {
                    signalsCount =
                        detectedState.signal !== NodeSignal.NONE ? 1 : 0;
                }
            }
        } else {
            for (const prev of node.backLinks) {
                const prevState = state.getNode(prev.nodeIdx);
                if (!prevState) continue;

                const isBypassedHead =
                    prev.headType !== CycleHeadType.NONE &&
                    prev.headType !== CycleHeadType.READ;

                if (isBypassedHead) continue;

                if (prevState.lastSignal === NodeSignal.ACTIVE) {
                    const isBlocker = prev.type === NodeType.BLOCKER;
                    if (isBlocker) {
                        blockedCount++;
                    } else {
                        signalsCount++;
                    }
                }
            }
        }

        nodeState.signalsCount = signalsCount;
        nodeState.blockedCount = blockedCount;
        nodeState.isUpdated = true;
        this.markNodeAsChangedNonTemp(state, nodeState);
        this.markNodeAsChanged(state, nodeState);
    }

    public updateState(state: RawGraphState) {
        for (let i = 0; i < state.changedNodes.length; i++) {
            const nodeState = state.changedNodes[i];
            const isActive = nodeState.signal === NodeSignal.ACTIVE;
            const isChanged = nodeState.lastSignal !== nodeState.signal;
            const nodeType = nodeState.type;
            const isBlocker = nodeType === NodeType.BLOCKER;
            const isCycleHead =
                nodeState.headType !== CycleHeadType.NONE &&
                nodeState.headType !== CycleHeadType.READ;

            if (isCycleHead) {
                if (
                    !isActive &&
                    (nodeState.headType !== CycleHeadType.CLEAR ||
                        nodeState.blockedCount === 0)
                )
                    continue;

                const cycleIdx = nodeState.cycleIdx;
                if (cycleIdx === null) continue;

                const cycleState = state.cycles[cycleIdx];
                if (!cycleState) continue;

                const cycleHeadType: CycleHeadType = nodeState.headType;
                switch (cycleHeadType) {
                    case CycleHeadType.WRITE:
                        cycleState.writeBit(state.tick, nodeState.cycleOffset);
                        break;
                    case CycleHeadType.XOR_WRITE:
                        cycleState.xorBit(state.tick, nodeState.cycleOffset);
                        break;
                    case CycleHeadType.CLEAR:
                        cycleState.clearBit(state.tick, nodeState.cycleOffset);
                        break;
                }
                this.markNodeAsChanged(state, nodeState);
                continue;
            }

            if (isChanged) {
                const delta = isActive ? 1 : -1;
                const isDelayed =
                    (nodeType === NodeType.DELAY &&
                        nodeState.signal === NodeSignal.PENDING) ||
                    (!isActive && nodeState.lastSignal === NodeSignal.PENDING);

                const linkedNodes = nodeState.links;
                const detectorNodes = nodeState.detectorLinks;

                if (!isDelayed) {
                    for (let i = 0; i < linkedNodes.length; i++) {
                        const edgeState = linkedNodes[i];

                        if (isBlocker) {
                            edgeState.blockedCount += delta;
                            this.markNodeAsChanged(state, edgeState);
                        } else {
                            edgeState.signalsCount += delta;
                            this.markNodeAsChanged(state, edgeState);
                        }
                    }
                }

                for (let i = 0; i < detectorNodes.length; i++) {
                    const detectorState = detectorNodes[i];

                    detectorState.signalsCount =
                        nodeState.signal !== NodeSignal.NONE ? 1 : 0;
                    this.markNodeAsChanged(state, detectorState);
                }

                nodeState.lastSignal = nodeState.signal;
            }

            if (
                nodeState.isUpdated ||
                (isChanged && nodeState.isAdditionalUpdate) ||
                (state.tick === 0 && nodeState.isEntryPoint) ||
                (nodeState.signal !== NodeSignal.NONE &&
                    nodeState.signalsCount === 0 &&
                    (nodeType === NodeType.BUTTON ||
                        nodeType === NodeType.DIRECTIONAL_BUTTON)) ||
                (nodeState.signalsCount > 0 &&
                    (nodeType === NodeType.RANDOM ||
                        nodeState.headType === CycleHeadType.READ))
            ) {
                nodeState.isUpdated = false;
                this.markNodeAsChanged(state, nodeState);
            }
        }

        const temp = state.changedNodes;
        state.changedNodes = state.tempChangedNodes;
        state.tempChangedNodes = temp;

        for (let i = 0; i < state.changedNodes.length; i++) {
            const nodeState = state.changedNodes[i];
            nodeState.isChanged = false;

            if (nodeState.blockedCount > 0) {
                if (nodeState.signal !== NodeSignal.NONE) {
                    nodeState.signal = NodeSignal.NONE;
                    state.makeDirtyChunk(nodeState.chunkIdx);
                }
            } else {
                const signal = this.updateNodeSignal(state, nodeState);
                if (signal !== NodeSignal.KEEP_SIGNAL) {
                    nodeState.signal = signal;
                    state.makeDirtyChunk(nodeState.chunkIdx);
                    if (
                        signal === NodeSignal.ACTIVE &&
                        nodeState.isBreakpoint
                    ) {
                        state.breakPoint = true;
                        state.breakPointNode = nodeState.nodeIdx;
                    }
                }
            }
        }

        state.tempChangedNodes.length = 0;
        state.tick += 1;
    }

    public markNodeAsChangedNonTemp(
        state: RawGraphState,
        nodeState: RawNodeState,
    ) {
        state.changedNodes.push(nodeState);
    }

    public markNodeAsChanged(state: RawGraphState, nodeState: RawNodeState) {
        if (nodeState.isChanged) return;
        nodeState.isChanged = true;
        state.tempChangedNodes.push(nodeState);
    }

    private updateNodeSignal(
        state: RawGraphState,
        nodeState: RawNodeState,
    ): NodeSignal {
        if (nodeState.headType === CycleHeadType.READ) {
            if (nodeState.signalsCount > 1) return NodeSignal.ACTIVE;
            if (nodeState.signalsCount === 0) return NodeSignal.NONE;

            const cycleIdx = nodeState.cycleIdx;
            if (cycleIdx === null) return NodeSignal.KEEP_SIGNAL;

            const cycleState = state.cycles[cycleIdx];
            if (!cycleState) return NodeSignal.KEEP_SIGNAL;

            const cycleActive = cycleState.getBit(
                state.tick,
                nodeState.cycleOffset,
            );
            return cycleActive ? NodeSignal.ACTIVE : NodeSignal.NONE;
        }
        switch (nodeState.type) {
            case NodeType.PATH:
            case NodeType.BLOCKER:
            case NodeType.DETECTOR:
            case NodeType.DIRECTIONAL_BUTTON:
                return nodeState.signalsCount > 0
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case NodeType.SOURCE:
                return NodeSignal.ACTIVE;
            case NodeType.DELAY:
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
            case NodeType.IMPULSE:
                if (nodeState.signal === NodeSignal.NONE)
                    return NodeSignal.ACTIVE;
                return NodeSignal.PENDING;
            case NodeType.LOGIC_NOT:
                return nodeState.signalsCount === 0
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case NodeType.LOGIC_AND:
                return nodeState.signalsCount > 1
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case NodeType.LOGIC_XOR:
                return nodeState.signalsCount % 2 === 1
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case NodeType.LATCH:
                if (nodeState.signalsCount > 1) return NodeSignal.ACTIVE;
                else if (nodeState.signalsCount === 1) return NodeSignal.NONE;
                return NodeSignal.KEEP_SIGNAL;
            case NodeType.FLIP_FLOP:
                if (nodeState.signalsCount > 0) {
                    if (nodeState.signal === NodeSignal.ACTIVE) {
                        return NodeSignal.NONE;
                    } else {
                        return NodeSignal.ACTIVE;
                    }
                }
                return NodeSignal.KEEP_SIGNAL;
            case NodeType.RANDOM:
                return nodeState.signalsCount > 0 && Math.random() > 0.5
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case NodeType.BUTTON:
                return NodeSignal.NONE;
            default:
                return NodeSignal.NONE;
        }
    }
}
