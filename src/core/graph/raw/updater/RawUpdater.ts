import { ArrowType } from 'src/core/utils/ArrowType';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import { CycleHeadType, type RawCycle } from '../CycleTypes';
import type { RawNode } from '../RawNode';
import { NodeSignal } from './NodeSignal';
import type { RawGraphState, RawNodeState } from './RawState';

export class RawGraphUpdater {
    public onCycleBuild(graphState: RawGraphState, cycle: RawCycle) {
        const cycleState = graphState.cycles[cycle.index];
        if (!cycleState) return;

        for (const node of cycle.nodes) {
            const nodeState = graphState.nodes[node.nodeIdx];

            if (nodeState.signal === NodeSignal.ACTIVE) {
                const position =
                    (graphState.tick + node.origCycleOffset) %
                    cycleState.length;
                const bitIndex = position % 32;
                const wordIndex = (position / 32) | 0;
                cycleState.state[wordIndex] |= 1 << bitIndex;
            }

            nodeState.signal = NodeSignal.NONE;
            nodeState.lastSignal = NodeSignal.NONE;
            graphState.makeDirtyNodeChunk(node);
        }

        for (const node of cycle.nodes) {
            const nodeState = graphState.nodes[node.nodeIdx];
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

            const nodeState = graphState.nodes[headNode.nodeIdx];
            if (headNode.headType !== CycleHeadType.NONE) {
                this.markNodeAsChangedNonTemp(graphState, nodeState);
                this.markNodeAsChanged(graphState, nodeState);
            }
        }

        const affectedNodes = new Set<RawNode>();
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
            const nodeState = graphState.nodes[node.nodeIdx];

            if (cycleState) {
                const position =
                    (graphState.tick + node.origCycleOffset) %
                    cycleState.length;
                const bitIndex = position % 32;
                const wordIndex = (position / 32) | 0;
                const isActive =
                    (cycleState.state[wordIndex] & (1 << bitIndex)) !== 0;

                if (isActive) {
                    nodeState.signal = NodeSignal.ACTIVE;
                    nodeState.lastSignal = nodeState.signal;
                    graphState.makeDirtyNodeChunk(node);
                } else {
                    if (nodeState.signal !== NodeSignal.ACTIVE)
                        nodeState.signal = NodeSignal.NONE;
                    nodeState.lastSignal = nodeState.signal;
                    graphState.makeDirtyNodeChunk(node);
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
            const headState = graphState.nodes[head.nodeIdx];
            if (headState) {
                headState.nodeInCycleOffset = 0;
            }
        }

        const affectedNodes = new Set<RawNode>();
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

    public updateNodeChange(
        graphState: RawGraphState,
        node: RawNode,
        oldNext: RawNode[],
        newNext: RawNode[],
    ) {
        const allNodes = new Set([...oldNext, ...newNext]);

        this.fullNodeStateCalculate(graphState, node);
        for (const edgeNode of allNodes) {
            this.fullNodeStateCalculate(graphState, edgeNode);
        }
    }

    public fullNodeStateCalculate(graphState: RawGraphState, node: RawNode) {
        const nodeState = graphState.nodes[node.nodeIdx];
        if (!nodeState || !node.valid) return;

        let signalsCount = 0;
        let blockedCount = 0;

        const isDetector = node.type === ArrowType.DETECTOR;

        if (isDetector) {
            if (node.detectedNode) {
                const detectedState =
                    graphState.nodes[node.detectedNode.nodeIdx];
                if (detectedState) {
                    signalsCount =
                        detectedState.signal !== NodeSignal.NONE ? 1 : 0;
                }
            }
        } else {
            for (const prev of node.previous) {
                const prevState = graphState.nodes[prev.nodeIdx];
                if (!prevState || !prev.valid) continue;

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
            const isReadHead = nodeState.node.headType === CycleHeadType.READ;

            if (isReadHead) {
                const cycle = nodeState.node.ioCycle;
                if (!cycle) continue;

                const cycleState = graphState.cycles[cycle.index];
                if (!cycleState) continue;

                const position =
                    (graphState.tick + nodeState.nodeInCycleOffset) %
                    cycleState.length;
                const bitIndex = position % 32;
                const wordIndex = (position - bitIndex) / 32;
                const mask = 1 << bitIndex;

                const cycleActive = (cycleState.state[wordIndex] & mask) !== 0;

                nodeState.prevCycleActive = nodeState.cycleActive;
                nodeState.cycleActive = cycleActive;
            }
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

                const position =
                    (graphState.tick + nodeState.nodeInCycleOffset) %
                    cycleState.length;
                const bitIndex = position % 32;
                const wordIndex = (position - bitIndex) / 32;
                const mask = 1 << bitIndex;

                const cycleHeadType: CycleHeadType = nodeState.node.headType;
                switch (cycleHeadType) {
                    case CycleHeadType.WRITE:
                        cycleState.state[wordIndex] |= mask;
                        break;
                    case CycleHeadType.XOR_WRITE:
                        cycleState.state[wordIndex] ^= mask;
                        break;
                    case CycleHeadType.CLEAR:
                        cycleState.state[wordIndex] &= ~mask;
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
                    .map((node) => graphState.nodes[node.nodeIdx]);
                const detectorNodes = nodeState.node.next
                    .filter(
                        (node) =>
                            node.type === ArrowType.DETECTOR &&
                            node.detectedNode === nodeState.node,
                    )
                    .map((node) => graphState.nodes[node.nodeIdx]);

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
                    graphState.makeDirtyNodeChunk(nodeState.node);
                }
            } else {
                const signal = this.updateNode(nodeState);
                if (signal !== NodeSignal.KEEP_SIGNAL) {
                    nodeState.signal = signal;
                    graphState.makeDirtyNodeChunk(nodeState.node);
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
        if (nodeState.isChanged || !nodeState.node.valid) return;
        nodeState.isChanged = true;
        graphState.tempChangedNodes.push(nodeState);
    }

    public updateNode(nodeState: RawNodeState): NodeSignal {
        const isReadHead = nodeState.node.headType === CycleHeadType.READ;

        if (isReadHead) {
            return nodeState.signalsCount + +nodeState.prevCycleActive > 1
                ? NodeSignal.ACTIVE
                : NodeSignal.NONE;
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
