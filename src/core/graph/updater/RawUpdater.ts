import { ArrowType } from 'src/core/utils/ArrowType';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import { CycleHeadType, type RawCycle } from '../CycleTypes';
import { NodeSignal } from '../core/NodeSignal';
import type { GraphNode } from '../GraphNode';
import type { RawGraphState, RawNodeState } from './RawState';

export class RawGraphUpdater {
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
                this.markNodeAsChangedNonTemp(graphState, nodeState);
                this.markNodeAsChanged(graphState, nodeState);
            }
        }

        for (const headNode of cycle.heads) {
            if (headNode.cycleRef === cycle) {
                continue;
            }

            const nodeState = graphState.getNode(headNode.nodeIdx);
            if (headNode.headType !== CycleHeadType.NONE) {
                this.markNodeAsChangedNonTemp(graphState, nodeState);
                this.markNodeAsChanged(graphState, nodeState);
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
            this.fullNodeStateCalculate(graphState, affectedNode);
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

            this.markNodeAsChangedNonTemp(graphState, nodeState);
            this.markNodeAsChanged(graphState, nodeState);
        }

        for (const node of cycle.nodes) {
            node.isCycle = false;
            node.cycleRef = null;
            node.headType = CycleHeadType.NONE;
            node.cycleOffset = 0;
        }
        for (const head of cycle.heads) {
            head.ioCycle = null;
            head.headType = CycleHeadType.NONE;
            head.cycleOffset = 0;
            const headState = graphState.getNode(head.nodeIdx);
            if (headState) {
                headState.nodeInCycleOffset = 0;
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
            this.fullNodeStateCalculate(graphState, affectedNode);
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

        this.fullNodeStateCalculate(graphState, node);
        for (const edgeNode of allNodes) {
            this.fullNodeStateCalculate(graphState, edgeNode);
        }
    }

    public fullNodeStateCalculate(graphState: RawGraphState, node: GraphNode) {
        const nodeState = graphState.getNode(node.nodeIdx);
        if (!nodeState) return;

        let signalsCount = 0;
        let blockedCount = 0;

        const isDetector = node.type === ArrowType.DETECTOR;

        if (isDetector) {
            if (node.detectedNode) {
                const detectedState = graphState.getNode(
                    node.detectedNode.nodeIdx,
                );
                if (detectedState) {
                    signalsCount =
                        detectedState.signal !== NodeSignal.NONE ? 1 : 0;
                }
            }
        } else {
            for (const prev of node.previous) {
                const prevState = graphState.getNode(prev.nodeIdx);
                if (!prevState) continue;

                const isBypassedHead =
                    prev.headType !== CycleHeadType.NONE &&
                    prev.headType !== CycleHeadType.READ;

                if (isBypassedHead) continue;

                if (prevState.lastSignal === NodeSignal.ACTIVE) {
                    const isBlocker = prev.type === ArrowType.BLOCKER;
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
        this.markNodeAsChangedNonTemp(graphState, nodeState);
        this.markNodeAsChanged(graphState, nodeState);
    }

    public updateState(graphState: RawGraphState) {
        for (let i = 0; i < graphState.changedNodes.length; i++) {
            const nodeState = graphState.changedNodes[i];
            const isActive = nodeState.signal === NodeSignal.ACTIVE;
            const isChanged = nodeState.lastSignal !== nodeState.signal;
            const nodeType = nodeState.node.type;
            const isBlocker = nodeType === ArrowType.BLOCKER;
            const isCycleHead =
                nodeState.node.headType !== CycleHeadType.NONE &&
                nodeState.node.headType !== CycleHeadType.READ;

            if (isCycleHead) {
                if (
                    !isActive &&
                    (nodeState.node.headType !== CycleHeadType.CLEAR ||
                        nodeState.blockedCount === 0)
                )
                    continue;
                const cycle = nodeState.node.cycleRef || nodeState.node.ioCycle;
                if (!cycle) continue;

                const cycleState = graphState.cycles[cycle.index];
                if (!cycleState) continue;

                const cycleHeadType: CycleHeadType = nodeState.node.headType;
                switch (cycleHeadType) {
                    case CycleHeadType.WRITE:
                        cycleState.writeBit(
                            graphState.tick,
                            nodeState.nodeInCycleOffset,
                        );
                        break;
                    case CycleHeadType.XOR_WRITE:
                        cycleState.xorBit(
                            graphState.tick,
                            nodeState.nodeInCycleOffset,
                        );
                        break;
                    case CycleHeadType.CLEAR:
                        cycleState.clearBit(
                            graphState.tick,
                            nodeState.nodeInCycleOffset,
                        );
                        break;
                }
                this.markNodeAsChanged(graphState, nodeState);
                continue;
            }

            if (isChanged) {
                const delta = isActive ? 1 : -1;
                const isDelayed =
                    (nodeType === ArrowType.DELAY &&
                        nodeState.signal === NodeSignal.PENDING) ||
                    (!isActive && nodeState.lastSignal === NodeSignal.PENDING);

                const nextNodes = nodeState.node.next
                    .filter((node) => node.type !== ArrowType.DETECTOR)
                    .map((node) => graphState.getNode(node.nodeIdx));
                const detectorNodes = nodeState.node.next
                    .filter(
                        (node) =>
                            node.type === ArrowType.DETECTOR &&
                            node.detectedNode === nodeState.node,
                    )
                    .map((node) => graphState.getNode(node.nodeIdx));

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
                (graphState.tick === 0 && nodeState.isEntryPoint) ||
                (nodeState.signal !== NodeSignal.NONE &&
                    nodeState.signalsCount === 0 &&
                    (nodeType === ArrowType.BUTTON ||
                        nodeType === ArrowType.DIRECTIONAL_BUTTON)) ||
                (nodeState.signalsCount > 0 &&
                    (nodeType === ArrowType.RANDOM ||
                        nodeState.node.headType === CycleHeadType.READ))
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

            if (nodeState.blockedCount > 0) {
                if (nodeState.signal !== NodeSignal.NONE) {
                    nodeState.signal = NodeSignal.NONE;
                    graphState.makeDirtyChunk(nodeState.node.chunkIdx);
                }
            } else {
                const signal = this.updateNodeSignal(graphState, nodeState);
                if (signal !== NodeSignal.KEEP_SIGNAL) {
                    nodeState.signal = signal;
                    graphState.makeDirtyChunk(nodeState.node.chunkIdx);
                    if (
                        signal === NodeSignal.ACTIVE &&
                        nodeState.node.isBreakpoint
                    ) {
                        graphState.breakPoint = true;
                    }
                }
            }
        }

        graphState.tempChangedNodes.length = 0;
        graphState.tick += 1;
    }

    public markNodeAsChangedNonTemp(
        graphState: RawGraphState,
        nodeState: RawNodeState,
    ) {
        graphState.changedNodes.push(nodeState);
    }

    public markNodeAsChanged(
        graphState: RawGraphState,
        nodeState: RawNodeState,
    ) {
        if (nodeState.isChanged) return;
        nodeState.isChanged = true;
        graphState.tempChangedNodes.push(nodeState);
    }

    private updateNodeSignal(
        graphState: RawGraphState,
        nodeState: RawNodeState,
    ): NodeSignal {
        if (nodeState.node.headType === CycleHeadType.READ) {
            if (nodeState.signalsCount > 1) return NodeSignal.ACTIVE;
            if (nodeState.signalsCount === 0) return NodeSignal.NONE;

            const cycle = nodeState.node.ioCycle;
            if (!cycle) return NodeSignal.KEEP_SIGNAL;

            const cycleState = graphState.cycles[cycle.index];
            if (!cycleState) return NodeSignal.KEEP_SIGNAL;

            const cycleActive = cycleState.getBit(
                graphState.tick,
                nodeState.nodeInCycleOffset,
            );
            return cycleActive ? NodeSignal.ACTIVE : NodeSignal.NONE;
        }
        switch (nodeState.node.type) {
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
