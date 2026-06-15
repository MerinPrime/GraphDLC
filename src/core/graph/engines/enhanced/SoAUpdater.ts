import { CycleHeadType } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { NodeType } from '../core/NodeType';
import { SoALayout } from './SoALayout';
import type { SoAGraphState } from './SoAState';

export class SoAGraphUpdater {
    public fullNodeStateCalculate(state: SoAGraphState, node: GraphNode) {
        const nodeIdx = node.nodeIdx;
        const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;
        const nodeData = state.nodeData;

        let signalsCount = 0;
        let blockedCount = 0;

        const isDetector = node.type === NodeType.DETECTOR;

        if (isDetector) {
            if (node.detectedLink) {
                const detectedOffset =
                    node.detectedLink.nodeIdx * SoALayout.Node.STRIDE;
                const detectedSignal = nodeData[
                    detectedOffset + SoALayout.Node.SIGNAL
                ] as NodeSignal;
                signalsCount = detectedSignal !== NodeSignal.NONE ? 1 : 0;
            }
        } else {
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

                const backOffset = back.nodeIdx * SoALayout.Node.STRIDE;
                const backLastSignal = nodeData[
                    backOffset + SoALayout.Node.LAST_SIGNAL
                ] as NodeSignal;

                if (backLastSignal === NodeSignal.ACTIVE) {
                    if (back.type === NodeType.BLOCKER) {
                        blockedCount++;
                    } else {
                        signalsCount++;
                    }
                }
            }
        }

        nodeData[nodeOffset + SoALayout.Node.SIGNALS_COUNT] = signalsCount;
        nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT] = blockedCount;

        // Читаем флаги один раз, модифицируем локально, пишем обратно один раз
        let flags = nodeData[nodeOffset + SoALayout.Node.FLAGS];
        flags |= SoALayout.Node.Flags.IsUpdated;

        state.changedNodes.add(nodeIdx);

        if ((flags & SoALayout.Node.Flags.IsChanged) === 0) {
            flags |= SoALayout.Node.Flags.IsChanged;
            state.tempChangedNodes.add(nodeIdx);
        }
        nodeData[nodeOffset + SoALayout.Node.FLAGS] = flags;
    }

    public updateState(state: SoAGraphState) {
        const nodeData = state.nodeData;
        const extra32NodeData = state.extra32NodeData;
        const extra8NodeData = state.extra8NodeData;
        const linkIndices = state.linkIndices;
        const detectorIndices = state.detectorIndices;

        const changedNodes = state.changedNodes;
        const tempChangedNodes = state.tempChangedNodes;

        const changedLength = changedNodes.length;
        const changedBuffer = changedNodes.buffer;
        const tick = state.tick;

        for (let i = 0; i < changedLength; i++) {
            const nodeIdx = changedBuffer[i];
            const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;

            const signal = nodeData[
                nodeOffset + SoALayout.Node.SIGNAL
            ] as NodeSignal;
            const lastSignal = nodeData[
                nodeOffset + SoALayout.Node.LAST_SIGNAL
            ] as NodeSignal;
            let flags = nodeData[nodeOffset + SoALayout.Node.FLAGS];

            const isActive = signal === NodeSignal.ACTIVE;
            const isChanged = lastSignal !== signal;
            const type = nodeData[nodeOffset + SoALayout.Node.TYPE] as NodeType;

            if ((flags & SoALayout.Node.Flags.IsCycleHead) !== 0) {
                const blockedCount =
                    nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT];
                const extra8Offset = nodeIdx * SoALayout.Extra8Node.STRIDE;
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

                const extra32Offset = nodeIdx * SoALayout.Extra32Node.STRIDE;
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

                    if ((flags & SoALayout.Node.Flags.IsChanged) === 0) {
                        flags |= SoALayout.Node.Flags.IsChanged;
                        tempChangedNodes.add(nodeIdx);
                        nodeData[nodeOffset + SoALayout.Node.FLAGS] = flags;
                    }
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
                        const linksOffset = nodeIdx * SoALayout.Links.STRIDE;
                        const isBlocker = type === NodeType.BLOCKER;
                        const targetOffsetField = isBlocker
                            ? SoALayout.Node.BLOCKED_COUNT
                            : SoALayout.Node.SIGNALS_COUNT;

                        const linksEnd = linksOffset + linksCount;
                        for (let j = linksOffset; j < linksEnd; j++) {
                            const edgeIdx = linkIndices[j];
                            const edgeOffset = edgeIdx * SoALayout.Node.STRIDE;

                            nodeData[edgeOffset + targetOffsetField] += delta;

                            const edgeFlags =
                                nodeData[edgeOffset + SoALayout.Node.FLAGS];
                            if (
                                (edgeFlags & SoALayout.Node.Flags.IsChanged) ===
                                0
                            ) {
                                nodeData[edgeOffset + SoALayout.Node.FLAGS] =
                                    edgeFlags | SoALayout.Node.Flags.IsChanged;
                                tempChangedNodes.add(edgeIdx);
                            }
                        }
                    }
                }

                const detectorsCount =
                    nodeData[nodeOffset + SoALayout.Node.DETECTORS_COUNT];
                if (detectorsCount !== 0) {
                    const detectorsOffset =
                        nodeIdx * SoALayout.Detectors.STRIDE;
                    const detectorSignalVal =
                        signal !== NodeSignal.NONE ? 1 : 0;

                    const detectorsEnd = detectorsOffset + detectorsCount;
                    for (let j = detectorsOffset; j < detectorsEnd; j++) {
                        const detectorIdx = detectorIndices[j];
                        const detectorOffset =
                            detectorIdx * SoALayout.Node.STRIDE;

                        nodeData[
                            detectorOffset + SoALayout.Node.SIGNALS_COUNT
                        ] = detectorSignalVal;

                        const detFlags =
                            nodeData[detectorOffset + SoALayout.Node.FLAGS];
                        if ((detFlags & SoALayout.Node.Flags.IsChanged) === 0) {
                            nodeData[detectorOffset + SoALayout.Node.FLAGS] =
                                detFlags | SoALayout.Node.Flags.IsChanged;
                            tempChangedNodes.add(detectorIdx);
                        }
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
                flags &= ~SoALayout.Node.Flags.IsUpdated;

                if ((flags & SoALayout.Node.Flags.IsChanged) === 0) {
                    flags |= SoALayout.Node.Flags.IsChanged;
                    tempChangedNodes.add(nodeIdx);
                }
                nodeData[nodeOffset + SoALayout.Node.FLAGS] = flags; // Записываем флаги обратно только в случае изменения
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
            const nodeOffset = nodeIdx * SoALayout.Node.STRIDE;

            // Считываем и сбрасываем флаг изменения за одно действие
            const flags = nodeData[nodeOffset + SoALayout.Node.FLAGS];
            nodeData[nodeOffset + SoALayout.Node.FLAGS] =
                flags & ~SoALayout.Node.Flags.IsChanged;

            const blockedCount =
                nodeData[nodeOffset + SoALayout.Node.BLOCKED_COUNT];
            const extra32NodeOffset = nodeIdx * SoALayout.Extra32Node.STRIDE;
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
                const type = nodeData[
                    nodeOffset + SoALayout.Node.TYPE
                ] as NodeType;
                const signalsCount =
                    nodeData[nodeOffset + SoALayout.Node.SIGNALS_COUNT];
                const currentSignal = nodeData[
                    nodeOffset + SoALayout.Node.SIGNAL
                ] as NodeSignal;

                // Передаем все считанные поля как аргументы (устраняет ВСЕ чтения nodeData внутри метода)
                const signal = this.updateNodeSignal(
                    state,
                    nodeIdx,
                    nodeOffset,
                    nodeData,
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
                        }
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
        const flags = state.nodeData[nodeOffset + SoALayout.Node.FLAGS];
        if ((flags & SoALayout.Node.Flags.IsChanged) !== 0) return;
        state.nodeData[nodeOffset + SoALayout.Node.FLAGS] =
            flags | SoALayout.Node.Flags.IsChanged;
        state.tempChangedNodes.add(nodeIdx);
    }

    private updateNodeSignal(
        state: SoAGraphState,
        nodeIdx: number,
        nodeOffset: number,
        nodeData: any,
        type: NodeType,
        signalsCount: number,
        flags: number,
        currentSignal: NodeSignal,
    ): NodeSignal {
        // Метод больше вообще не обращается к nodeData за свойствами текущего узла!
        if ((flags & SoALayout.Node.Flags.IsReadHead) !== 0) {
            if (signalsCount > 1) return NodeSignal.ACTIVE;
            if (signalsCount === 0) return NodeSignal.NONE;

            const extra32Offset = nodeIdx * SoALayout.Extra32Node.STRIDE;
            const cycleIdx =
                state.extra32NodeData[
                    extra32Offset + SoALayout.Extra32Node.CYCLE_IDX
                ];
            const cycleOffset =
                state.extra32NodeData[
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
                return signalsCount % 2 === 1
                    ? NodeSignal.ACTIVE
                    : NodeSignal.NONE;
            case NodeType.LATCH:
                if (signalsCount > 1) return NodeSignal.ACTIVE;
                else if (signalsCount === 1) return NodeSignal.NONE;
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
            case NodeType.BUTTON:
                return NodeSignal.NONE;
            default:
                return NodeSignal.NONE;
        }
    }
}
