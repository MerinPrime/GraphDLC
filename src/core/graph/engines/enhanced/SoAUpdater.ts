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
        const nodeOffset = node.nodeIdx * SoALayout.Node.STRIDE;

        const signalsCountOffset = nodeOffset + SoALayout.Node.SIGNALS_COUNT;
        const blockedCountOffset = nodeOffset + SoALayout.Node.BLOCKED_COUNT;
        const flagsOffset = nodeOffset + SoALayout.Node.FLAGS;

        let signalsCount = 0;
        let blockedCount = 0;

        const isDetector = node.type === NodeType.DETECTOR;

        if (isDetector) {
            if (node.detectedLink) {
                const detectedOffset =
                    node.detectedLink.nodeIdx * SoALayout.Node.STRIDE;
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

        state.nodeData[signalsCountOffset] = signalsCount;
        state.nodeData[blockedCountOffset] = blockedCount;
        state.nodeData[flagsOffset] |= SoALayout.Node.Flags.IsUpdated;

        this.markNodeAsChangedNonTemp(state, nodeState.nodeIdx);
        this.markNodeAsChanged(state, nodeState.nodeIdx);
    }

    public updateState(state: SoAGraphState) {
        for (let i = 0; i < state.changedNodes.length; i++) {
            const nodeIdx = state.changedNodes.buffer[i];
            const nodeState = state.getNode(nodeIdx);
            const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;

            const signal = state.nodeData[
                nodeOffset + SoALayout.Node.SIGNAL
            ] as NodeSignal;
            const lastSignal = state.nodeData[
                nodeOffset + SoALayout.Node.LAST_SIGNAL
            ] as NodeSignal;

            const flags = state.nodeData[nodeOffset + SoALayout.Node.FLAGS];

            const isActive = signal === NodeSignal.ACTIVE;
            const isChanged = lastSignal !== signal;

            const type = state.nodeData[
                nodeOffset + SoALayout.Node.TYPE
            ] as NodeType;
            const isBlocker = type === NodeType.BLOCKER;
            const isCycleHead =
                nodeState.headType !== CycleHeadType.NONE &&
                nodeState.headType !== CycleHeadType.READ;

            if (isCycleHead) {
                const blockedCount =
                    state.nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT];
                if (
                    !isActive &&
                    (nodeState.headType !== CycleHeadType.CLEAR ||
                        blockedCount === 0)
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
                this.markNodeAsChanged(state, nodeIdx);
                continue;
            }

            if (isChanged) {
                const delta = isActive ? 1 : -1;
                const isDelayed =
                    (type === NodeType.DELAY &&
                        signal === NodeSignal.PENDING) ||
                    (!isActive && lastSignal === NodeSignal.PENDING);

                if (!isDelayed) {
                    const linksCount =
                        state.nodeData[nodeOffset + SoALayout.Node.LINKS_COUNT];
                    if (linksCount !== 0) {
                        const linksOffset = nodeIdx * SoALayout.Links.STRIDE;
                        for (let i = 0; i < linksCount; i++) {
                            const edgeIdx = state.linkIndices[linksOffset + i];
                            const edgeOffset = edgeIdx * SoALayout.Node.STRIDE;

                            if (isBlocker) {
                                state.nodeData[
                                    edgeOffset + SoALayout.Node.BLOCKED_COUNT
                                ] += delta;
                                this.markNodeAsChanged(state, edgeIdx);
                            } else {
                                state.nodeData[
                                    edgeOffset + SoALayout.Node.SIGNALS_COUNT
                                ] += delta;
                                this.markNodeAsChanged(state, edgeIdx);
                            }
                        }
                    }
                }

                const detectorsCount =
                    state.nodeData[nodeOffset + SoALayout.Node.DETECTORS_COUNT];
                if (detectorsCount !== 0) {
                    const detectorsOffset =
                        nodeIdx * SoALayout.Detectors.STRIDE;

                    for (let i = 0; i < detectorsCount; i++) {
                        const detectorIdx =
                            state.detectorIndices[detectorsOffset + i];
                        const detectorOffset =
                            detectorIdx * SoALayout.Node.STRIDE;

                        state.nodeData[
                            detectorOffset + SoALayout.Node.SIGNALS_COUNT
                        ] = signal !== NodeSignal.NONE ? 1 : 0;
                        this.markNodeAsChanged(state, detectorIdx);
                    }
                }

                state.nodeData[nodeOffset + SoALayout.Node.LAST_SIGNAL] =
                    signal;
            }

            const signalsCount =
                state.nodeData[nodeOffset + SoALayout.Node.SIGNALS_COUNT];

            if (
                (flags & SoALayout.Node.Flags.IsUpdated) !== 0 ||
                (isChanged &&
                    (flags & SoALayout.Node.Flags.IsAdditionalUpdate) !== 0) ||
                (state.tick === 0 &&
                    (flags & SoALayout.Node.Flags.IsEntryPoint) !== 0) ||
                (signal !== NodeSignal.NONE &&
                    signalsCount === 0 &&
                    (type === NodeType.BUTTON ||
                        type === NodeType.DIRECTIONAL_BUTTON)) ||
                (signalsCount > 0 &&
                    (type === NodeType.RANDOM ||
                        nodeState.headType === CycleHeadType.READ))
            ) {
                state.nodeData[nodeOffset + SoALayout.Node.FLAGS] &=
                    ~SoALayout.Node.Flags.IsUpdated;
                this.markNodeAsChanged(state, nodeIdx);
            }
        }

        const temp = state.changedNodes;
        state.changedNodes = state.tempChangedNodes;
        state.tempChangedNodes = temp;

        for (let i = 0; i < state.changedNodes.length; i++) {
            const nodeIdx = state.changedNodes.buffer[i];
            const nodeState = state.getNode(nodeIdx);
            const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
            state.nodeData[nodeOffset + SoALayout.Node.FLAGS] &=
                ~SoALayout.Node.Flags.IsChanged;

            const blockedCount =
                state.nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT];
            if (blockedCount > 0) {
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
                    const flagsOffset = nodeOffset + SoALayout.Node.FLAGS;
                    const isBreakpoint =
                        (state.nodeData[nodeOffset + flagsOffset] &
                            SoALayout.Node.Flags.IsBreakpoint) !==
                        0;
                    if (signal === NodeSignal.ACTIVE && isBreakpoint) {
                        state.breakPoint = true;
                    }
                }
            }
        }

        state.tempChangedNodes.clear();
        state.tick += 1;
    }

    public markNodeAsChangedNonTemp(state: SoAGraphState, nodeIdx: number) {
        state.changedNodes.add(nodeIdx);
    }

    public markNodeAsChanged(state: SoAGraphState, nodeIdx: number) {
        const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
        const flagsOffset = nodeOffset + SoALayout.Node.FLAGS;
        if (state.nodeData[flagsOffset] & SoALayout.Node.Flags.IsChanged)
            return;
        state.nodeData[flagsOffset] |= SoALayout.Node.Flags.IsChanged;
        state.tempChangedNodes.add(nodeIdx);
    }

    private updateNodeSignal(
        state: SoAGraphState,
        nodeState: SoANodeState,
        nodeOffset: number,
    ): NodeSignal {
        const signalsCount =
            state.nodeData[nodeOffset + SoALayout.Node.SIGNALS_COUNT];

        if (nodeState.headType === CycleHeadType.READ) {
            if (signalsCount > 1) return NodeSignal.ACTIVE;
            if (signalsCount === 0) return NodeSignal.NONE;

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

        const type = state.nodeData[
            nodeOffset + SoALayout.Node.TYPE
        ] as NodeType;

        switch (type) {
            case NodeType.PATH:
            case NodeType.BLOCKER:
            case NodeType.DETECTOR:
            case NodeType.DIRECTIONAL_BUTTON:
                return signalsCount > 0 ? NodeSignal.ACTIVE : NodeSignal.NONE;
            case NodeType.SOURCE:
                return NodeSignal.ACTIVE;
            case NodeType.DELAY: {
                const signal = state.nodeData[
                    nodeOffset + SoALayout.Node.SIGNAL
                ] as NodeSignal;
                if (signal === NodeSignal.PENDING) {
                    return NodeSignal.ACTIVE;
                } else if (signalsCount > 0) {
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
                return signalsCount === 0 ? NodeSignal.ACTIVE : NodeSignal.NONE;
            case NodeType.LOGIC_AND:
                return signalsCount > 1 ? NodeSignal.ACTIVE : NodeSignal.NONE;
            case NodeType.LOGIC_XOR:
                return signalsCount % 2 === 1
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case NodeType.LATCH:
                if (signalsCount > 1) return NodeSignal.ACTIVE;
                else if (signalsCount === 1) return NodeSignal.NONE;
                return NodeSignal.KEEP_SIGNAL;
            case NodeType.FLIP_FLOP:
                if (signalsCount > 0) {
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
                return signalsCount > 0 && Math.random() > 0.5
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case NodeType.BUTTON:
                return NodeSignal.NONE;
            default:
                return NodeSignal.NONE;
        }
    }
}
