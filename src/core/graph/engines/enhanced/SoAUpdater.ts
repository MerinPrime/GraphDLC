import { CycleHeadType } from 'src/core/graph/ast/cycle/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { NodeType } from '../core/NodeType';
import { SoALayout } from './SoALayout';
import type { SoAGraphState } from './SoAState';

export class SoAGraphUpdater {
    public fullNodeStateCalculate(state: SoAGraphState, node: GraphNode): void {
        const nodeIdx = node.nodeIdx;
        const storage = state.storage;
        const nodeOffset = storage.inlineNodeOffset(nodeIdx);
        const nodeData = storage.nodeData;

        let signalsCount = 0;
        let blockedCount = 0;

        const isDetector = node.type === NodeType.DETECTOR;

        if (isDetector && node.detectedLink) {
            const detectedOffset = storage.inlineNodeOffset(
                node.detectedLink.nodeIdx,
            );
            const detectedSignal = nodeData[
                detectedOffset + SoALayout.Node.SIGNAL
            ] as NodeSignal;
            signalsCount = detectedSignal !== NodeSignal.NONE ? 1 : 0;
        }

        const backLinks = node.backLinks;
        const backLinksLen = backLinks.length;
        for (let i = 0; i < backLinksLen; i++) {
            const back = backLinks[i];
            if (
                back.headType !== CycleHeadType.NONE &&
                back.headType !== CycleHeadType.READ
            ) {
                continue;
            }

            const backOffset = storage.inlineNodeOffset(back.nodeIdx);
            const backLastSignal = nodeData[
                backOffset + SoALayout.Node.LAST_SIGNAL
            ] as NodeSignal;

            if (backLastSignal === NodeSignal.ACTIVE) {
                if (
                    back.type === NodeType.BLOCKER &&
                    back.blockedLink === node
                ) {
                    blockedCount++;
                } else if (!isDetector) {
                    signalsCount++;
                }
            }
        }

        nodeData[nodeOffset + SoALayout.Node.SIGNALS_COUNT] = signalsCount;
        nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT] = blockedCount;

        nodeData[nodeOffset + SoALayout.Node.FLAGS] |=
            SoALayout.Node.Flags.IsUpdated;
        this.markNodeAsChangedNonTemp(state, nodeIdx);
        this.markNodeAsChanged(state, nodeIdx);
    }

    public updateState(state: SoAGraphState): void {
        const storage = state.storage;
        const nodeData = storage.nodeData;
        const extra32NodeData = storage.extra32NodeData;
        const extra8NodeData = storage.extra8NodeData;
        const linkIndices = storage.linkIndices;
        const detectorIndices = storage.detectorIndices;

        const changedNodes = state.changedNodes;
        const tempChangedNodes = state.tempChangedNodes;

        const changedLength = changedNodes.length;
        const changedBuffer = changedNodes.buffer;
        const tick = state.tick;

        for (let i = 0; i < changedLength; i++) {
            const nodeIdx = changedBuffer[i];
            const nodeOffset = storage.inlineNodeOffset(nodeIdx);

            const signal = nodeData[
                nodeOffset + SoALayout.Node.SIGNAL
            ] as NodeSignal;
            const lastSignal = nodeData[
                nodeOffset + SoALayout.Node.LAST_SIGNAL
            ] as NodeSignal;
            const flags = nodeData[nodeOffset + SoALayout.Node.FLAGS];

            const isActive = signal === NodeSignal.ACTIVE;
            const isChanged = lastSignal !== signal;
            const type = nodeData[nodeOffset + SoALayout.Node.TYPE] as NodeType;

            if ((flags & SoALayout.Node.Flags.IsCycleHead) !== 0) {
                const blockedCount =
                    nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT];
                const extra8Offset = storage.inlineExtra8Offset(nodeIdx);
                const cycleHeadType = extra8NodeData[
                    extra8Offset + SoALayout.Extra8Node.HEAD_TYPE
                ] as CycleHeadType;

                if (
                    !isActive &&
                    (cycleHeadType !== CycleHeadType.CLEAR ||
                        blockedCount === 0)
                ) {
                    continue;
                }

                const extra32Offset = storage.inlineExtra32Offset(nodeIdx);
                const cycleIdx =
                    extra32NodeData[
                        extra32Offset + SoALayout.Extra32Node.CYCLE_IDX
                    ];
                const cycleOffset =
                    extra32NodeData[
                        extra32Offset + SoALayout.Extra32Node.CYCLE_OFFSET
                    ];

                const cycleState = state.cycles[cycleIdx];
                if (cycleState) {
                    switch (cycleHeadType) {
                        case CycleHeadType.WRITE:
                            cycleState.writeBit(tick, cycleOffset);
                            break;
                        case CycleHeadType.XOR_WRITE:
                            cycleState.xorBit(tick, cycleOffset);
                            break;
                        case CycleHeadType.CLEAR:
                            cycleState.clearBit(tick, cycleOffset);
                            break;
                    }

                    this.markNodeAsChanged(state, nodeIdx);
                }
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
                        nodeData[nodeOffset + SoALayout.Node.LINKS_COUNT];
                    if (linksCount !== 0) {
                        const linksOffset = storage.inlineLinksOffset(nodeIdx);
                        const isBlocker = type === NodeType.BLOCKER;
                        const linksEnd = linksOffset + linksCount;

                        if (isBlocker) {
                            const extra32Offset =
                                storage.inlineExtra32Offset(nodeIdx);
                            const blockedLinkIdx =
                                extra32NodeData[
                                    extra32Offset +
                                        SoALayout.Extra32Node.BLOCKED_LINK_IDX
                                ];

                            for (let j = linksOffset; j < linksEnd; j++) {
                                const edgeIdx = linkIndices[j];
                                const edgeOffset =
                                    storage.inlineNodeOffset(edgeIdx);
                                const targetOffsetField =
                                    edgeIdx === blockedLinkIdx
                                        ? SoALayout.Node.BLOCKED_COUNT
                                        : SoALayout.Node.SIGNALS_COUNT;

                                nodeData[edgeOffset + targetOffsetField] +=
                                    delta;
                                this.markNodeAsChanged(state, edgeIdx);
                            }
                        } else {
                            for (let j = linksOffset; j < linksEnd; j++) {
                                const edgeIdx = linkIndices[j];
                                const edgeOffset =
                                    storage.inlineNodeOffset(edgeIdx);

                                nodeData[
                                    edgeOffset + SoALayout.Node.SIGNALS_COUNT
                                ] += delta;
                                this.markNodeAsChanged(state, edgeIdx);
                            }
                        }
                    }
                }

                const detectorsCount =
                    nodeData[nodeOffset + SoALayout.Node.DETECTORS_COUNT];
                if (detectorsCount !== 0) {
                    const detectorsOffset =
                        storage.inlineDetectorsOffset(nodeIdx);
                    const detectorSignalVal =
                        signal !== NodeSignal.NONE ? 1 : 0;
                    const detectorsEnd = detectorsOffset + detectorsCount;

                    for (let j = detectorsOffset; j < detectorsEnd; j++) {
                        const detectorIdx = detectorIndices[j];
                        const detectorOffset =
                            storage.inlineNodeOffset(detectorIdx);

                        nodeData[
                            detectorOffset + SoALayout.Node.SIGNALS_COUNT
                        ] = detectorSignalVal;
                        this.markNodeAsChanged(state, detectorIdx);
                    }
                }

                nodeData[nodeOffset + SoALayout.Node.LAST_SIGNAL] = signal;
            }

            const signalsCount =
                nodeData[nodeOffset + SoALayout.Node.SIGNALS_COUNT];

            if (
                (flags & SoALayout.Node.Flags.IsUpdated) !== 0 ||
                (isChanged &&
                    (flags & SoALayout.Node.Flags.IsAdditionalUpdate) !== 0) ||
                (tick === 0 &&
                    (flags & SoALayout.Node.Flags.IsEntryPoint) !== 0) ||
                (signal !== NodeSignal.NONE &&
                    signalsCount === 0 &&
                    (type === NodeType.BUTTON ||
                        type === NodeType.DIRECTIONAL_BUTTON)) ||
                (signalsCount > 0 &&
                    (type === NodeType.RANDOM ||
                        (flags & SoALayout.Node.Flags.IsReadHead) !== 0))
            ) {
                nodeData[nodeOffset + SoALayout.Node.FLAGS] &=
                    ~SoALayout.Node.Flags.IsUpdated;
                this.markNodeAsChanged(state, nodeIdx);
            }
        }

        const temp = state.changedNodes;
        state.changedNodes = tempChangedNodes;
        state.tempChangedNodes = temp;

        const nextChangedNodes = state.changedNodes;
        const nextChangedLen = nextChangedNodes.length;
        const nextChangedBuffer = nextChangedNodes.buffer;

        for (let i = 0; i < nextChangedLen; i++) {
            const nodeIdx = nextChangedBuffer[i];
            const nodeOffset = storage.inlineNodeOffset(nodeIdx);

            nodeData[nodeOffset + SoALayout.Node.FLAGS] &=
                ~SoALayout.Node.Flags.IsChanged;

            const blockedCount =
                nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT];
            const extra32NodeOffset = storage.inlineExtra32Offset(nodeIdx);
            const chunkIdx =
                extra32NodeData[
                    extra32NodeOffset + SoALayout.Extra32Node.CHUNK_IDX
                ];

            if (blockedCount > 0) {
                if (
                    nodeData[nodeOffset + SoALayout.Node.SIGNAL] !==
                    NodeSignal.NONE
                ) {
                    nodeData[nodeOffset + SoALayout.Node.SIGNAL] =
                        NodeSignal.NONE;
                    state.makeDirtyChunk(chunkIdx);
                }
            } else {
                const flags = nodeData[nodeOffset + SoALayout.Node.FLAGS];
                const type = nodeData[
                    nodeOffset + SoALayout.Node.TYPE
                ] as NodeType;
                const signalsCount =
                    nodeData[nodeOffset + SoALayout.Node.SIGNALS_COUNT];
                const currentSignal = nodeData[
                    nodeOffset + SoALayout.Node.SIGNAL
                ] as NodeSignal;

                const signal = this.updateNodeSignal(
                    state,
                    nodeIdx,
                    type,
                    signalsCount,
                    flags,
                    currentSignal,
                );

                if (signal !== NodeSignal.KEEP_SIGNAL) {
                    if (currentSignal !== signal) {
                        nodeData[nodeOffset + SoALayout.Node.SIGNAL] = signal;
                        state.makeDirtyChunk(chunkIdx);

                        if (
                            signal === NodeSignal.ACTIVE &&
                            (flags & SoALayout.Node.Flags.IsBreakpoint) !== 0
                        ) {
                            state.breakPoint = true;
                            state.breakPointNode = nodeIdx;
                        }
                    }
                }
            }
        }

        state.tempChangedNodes.clear();
        state.tick += 1;
    }

    public markNodeAsChangedNonTemp(
        state: SoAGraphState,
        nodeIdx: number,
    ): void {
        state.changedNodes.add(nodeIdx);
    }

    public markNodeAsChanged(state: SoAGraphState, nodeIdx: number): void {
        const nodeOffset = state.storage.inlineNodeOffset(nodeIdx);
        const flags = state.storage.nodeData[nodeOffset + SoALayout.Node.FLAGS];
        if ((flags & SoALayout.Node.Flags.IsChanged) !== 0) return;

        state.storage.nodeData[nodeOffset + SoALayout.Node.FLAGS] =
            flags | SoALayout.Node.Flags.IsChanged;
        state.tempChangedNodes.add(nodeIdx);
    }

    private updateNodeSignal(
        state: SoAGraphState,
        nodeIdx: number,
        type: NodeType,
        signalsCount: number,
        flags: number,
        currentSignal: NodeSignal,
    ): NodeSignal {
        if ((flags & SoALayout.Node.Flags.IsReadHead) !== 0) {
            if (signalsCount > 1) return NodeSignal.ACTIVE;
            if (signalsCount === 0) return NodeSignal.NONE;

            const extra32Offset = state.storage.inlineExtra32Offset(nodeIdx);
            const cycleIdx =
                state.storage.extra32NodeData[
                    extra32Offset + SoALayout.Extra32Node.CYCLE_IDX
                ];
            const cycleOffset =
                state.storage.extra32NodeData[
                    extra32Offset + SoALayout.Extra32Node.CYCLE_OFFSET
                ];

            const cycleState = state.cycles[cycleIdx];
            if (!cycleState) return NodeSignal.KEEP_SIGNAL;

            return cycleState.getBit(state.tick, cycleOffset)
                ? NodeSignal.ACTIVE
                : NodeSignal.NONE;
        }

        switch (type) {
            case NodeType.PATH:
            case NodeType.BLOCKER:
            case NodeType.DETECTOR:
            case NodeType.DIRECTIONAL_BUTTON:
                return signalsCount > 0 ? NodeSignal.ACTIVE : NodeSignal.NONE;

            case NodeType.SOURCE:
                return NodeSignal.ACTIVE;

            case NodeType.DELAY: {
                if (currentSignal === NodeSignal.PENDING) {
                    return NodeSignal.ACTIVE;
                } else if (signalsCount > 0) {
                    if (currentSignal === NodeSignal.NONE) {
                        return NodeSignal.PENDING;
                    }
                } else {
                    return NodeSignal.NONE;
                }
                return NodeSignal.KEEP_SIGNAL;
            }

            case NodeType.IMPULSE: {
                if (currentSignal === NodeSignal.NONE) return NodeSignal.ACTIVE;
                return NodeSignal.PENDING;
            }

            case NodeType.LOGIC_NOT:
                return signalsCount === 0 ? NodeSignal.ACTIVE : NodeSignal.NONE;

            case NodeType.LOGIC_AND:
                return signalsCount > 1 ? NodeSignal.ACTIVE : NodeSignal.NONE;

            case NodeType.LOGIC_XOR:
                return (signalsCount & 1) === 1
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;

            case NodeType.LATCH:
                if (signalsCount > 1) return NodeSignal.ACTIVE;
                if (signalsCount === 1) return NodeSignal.NONE;
                return NodeSignal.KEEP_SIGNAL;

            case NodeType.FLIP_FLOP:
                if (signalsCount > 0) {
                    return currentSignal === NodeSignal.ACTIVE
                        ? NodeSignal.NONE
                        : NodeSignal.ACTIVE;
                }
                return NodeSignal.KEEP_SIGNAL;

            case NodeType.RANDOM:
                return signalsCount > 0 && Math.random() > 0.5
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;

            default:
                return NodeSignal.NONE;
        }
    }
}
