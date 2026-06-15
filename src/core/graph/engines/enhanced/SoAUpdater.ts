import { CycleHeadType } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { NodeType } from '../core/NodeType';
import { SoALayout } from './SoALayout';
import type { SoAGraphState, SoANodeState } from './SoAState';

export class SoAGraphUpdater {
    public fullNodeStateCalculate(state: SoAGraphState, node: GraphNode) {
        const nodeState = state.getNode(node.nodeIdx);
        if (!nodeState) return;

        let signalsCount = 0;
        let blockedCount = 0;

        const isDetector = node.type === NodeType.DETECTOR;

        if (isDetector) {
            if (node.detectedLink) {
                const detectedOffset = node.detectedLink.nodeIdx;
                const detectedSignal = state.nodeData[
                    detectedOffset + SoALayout.Node.SIGNAL
                ] as NodeSignal;
                signalsCount = detectedSignal !== NodeSignal.NONE ? 1 : 0;
            }
        } else {
            for (const back of node.backLinks) {
                const backOffset = back.nodeIdx * SoALayout.Node.STRIDE;

                const isBypassedHead =
                    back.headType !== CycleHeadType.NONE &&
                    back.headType !== CycleHeadType.READ;

                if (isBypassedHead) continue;

                const backLastSignal = state.nodeData[
                    backOffset + SoALayout.Node.LAST_SIGNAL
                ] as NodeSignal;

                if (backLastSignal === NodeSignal.ACTIVE) {
                    const isBlocker = back.type === NodeType.BLOCKER;
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

    public updateState(state: SoAGraphState) {
        for (let i = 0; i < state.changedNodes.length; i++) {
            const nodeState = state.changedNodes[i];
            const nodeOffset = nodeState.nodeIdx * SoALayout.Node.STRIDE;

            const signal = state.nodeData[
                nodeOffset + SoALayout.Node.SIGNAL
            ] as NodeSignal;
            const lastSignal = state.nodeData[
                nodeOffset + SoALayout.Node.LAST_SIGNAL
            ] as NodeSignal;

            const isActive = signal === NodeSignal.ACTIVE;
            const isChanged = lastSignal !== signal;

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
                        signal === NodeSignal.PENDING) ||
                    (!isActive && lastSignal === NodeSignal.PENDING);

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
                        signal !== NodeSignal.NONE ? 1 : 0;
                    this.markNodeAsChanged(state, detectorState);
                }

                state.nodeData[nodeOffset + SoALayout.Node.LAST_SIGNAL] =
                    signal;
            }

            if (
                nodeState.isUpdated ||
                (isChanged && nodeState.isAdditionalUpdate) ||
                (state.tick === 0 && nodeState.isEntryPoint) ||
                (signal !== NodeSignal.NONE &&
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

            const nodeOffset = nodeState.nodeIdx * SoALayout.Node.STRIDE;

            if (nodeState.blockedCount > 0) {
                state.nodeData[nodeOffset + SoALayout.Node.SIGNAL] =
                    NodeSignal.NONE;
                state.makeDirtyChunk(nodeState.chunkIdx);
            } else {
                const signal = this.updateNodeSignal(
                    state,
                    nodeState,
                    nodeOffset,
                );
                if (signal !== NodeSignal.KEEP_SIGNAL) {
                    state.nodeData[nodeOffset + SoALayout.Node.SIGNAL] = signal;
                    state.makeDirtyChunk(nodeState.chunkIdx);
                    if (
                        signal === NodeSignal.ACTIVE &&
                        nodeState.isBreakpoint
                    ) {
                        state.breakPoint = true;
                    }
                }
            }
        }

        state.tempChangedNodes.length = 0;
        state.tick += 1;
    }

    public markNodeAsChangedNonTemp(
        state: SoAGraphState,
        nodeState: SoANodeState,
    ) {
        state.changedNodes.push(nodeState);
    }

    public markNodeAsChanged(state: SoAGraphState, nodeState: SoANodeState) {
        if (nodeState.isChanged) return;
        nodeState.isChanged = true;
        state.tempChangedNodes.push(nodeState);
    }

    private updateNodeSignal(
        state: SoAGraphState,
        nodeState: SoANodeState,
        nodeOffset: number,
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
            case NodeType.DELAY: {
                const signal = state.nodeData[
                    nodeOffset + SoALayout.Node.SIGNAL
                ] as NodeSignal;
                if (signal === NodeSignal.PENDING) {
                    return NodeSignal.ACTIVE;
                } else if (nodeState.signalsCount > 0) {
                    if (signal === NodeSignal.NONE) {
                        return NodeSignal.PENDING;
                    }
                } else {
                    return NodeSignal.NONE;
                }
                return NodeSignal.KEEP_SIGNAL;
            }
            case NodeType.IMPULSE: {
                const signal = state.nodeData[
                    nodeOffset + SoALayout.Node.SIGNAL
                ] as NodeSignal;
                if (signal === NodeSignal.NONE) return NodeSignal.ACTIVE;
                return NodeSignal.PENDING;
            }
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
                    const signal = state.nodeData[
                        nodeOffset + SoALayout.Node.SIGNAL
                    ] as NodeSignal;
                    if (signal === NodeSignal.ACTIVE) {
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
