import { type Bounds, InBounds } from 'src/patches/graph/PatchGame';
import type { RawGraph } from '../graph/raw/RawGraph';
import {
    CycleHeadType,
    type RawCycle,
    type RawNode,
} from '../graph/raw/RawNode';
import {
    DebugMode,
    DebugModeSetting,
} from '../settings/instances/other/DebugModeSetting';
import { ArrowType, IsArrowEntryPoint } from '../utils/ArrowType';

export class GraphDebug {
    public colorizeDebug(
        rawGraph: RawGraph,
        bounds: Bounds,
        renderColor: (
            node: RawNode,
            r: number,
            g: number,
            b: number,
            a: number,
        ) => void,
    ) {
        switch (DebugModeSetting.value) {
            case DebugMode.OFF:
                break;
            case DebugMode.SHOW_RINGS:
                this.showRings(rawGraph, bounds, renderColor);
                break;
            case DebugMode.SHOW_SIGNAL_PROPAGATION:
                this.showSignalPropagation(rawGraph, bounds, renderColor);
                break;
            case DebugMode.SHOW_UNUSED_ARROWS:
                this.showDeadNodes(rawGraph, bounds, renderColor);
                break;
            default:
                throw new Error('Method not implemented.');
        }
    }

    private showRings(
        rawGraph: RawGraph,
        bounds: Bounds,
        renderColor: (
            node: RawNode,
            r: number,
            g: number,
            b: number,
            a: number,
        ) => void,
    ) {
        const cycles = new Set<RawCycle>();
        rawGraph.nodes.forEach((node) => {
            if (!node.cycleRef) return;
            cycles.add(node.cycleRef);
        });
        cycles.forEach((cycle) => {
            cycle.nodes.forEach((node) => {
                if (InBounds(bounds, node.globalX, node.globalY))
                    renderColor(node, 0.8, 0.2, 0.8, 0.25);
            });
            cycle.heads.forEach((node) => {
                if (!InBounds(bounds, node.globalX, node.globalY)) return;
                if (node.headType === CycleHeadType.READ)
                    renderColor(node, 0.2, 0.2, 0.8, 0.25);
                if (node.headType === CycleHeadType.WRITE)
                    renderColor(node, 0.2, 0.8, 0.2, 0.25);
                if (node.headType === CycleHeadType.CLEAR)
                    renderColor(node, 0.8, 0.2, 0.2, 0.25);
                if (node.headType === CycleHeadType.XOR_WRITE)
                    renderColor(node, 0.8, 0.8, 0.2, 0.25);
            });
        });
    }

    private showSignalPropagation(
        rawGraph: RawGraph,
        bounds: Bounds,
        renderColor: (
            node: RawNode,
            r: number,
            g: number,
            b: number,
            a: number,
        ) => void,
    ) {
        const colors: [r: number, g: number, b: number][] = [
            [0.8, 0.2, 0.2],
            [0.2, 0.8, 0.2],
            [0.2, 0.2, 0.8],
            [0.8, 0.8, 0.2],
            [0.8, 0.2, 0.8],
            [0.2, 0.8, 0.8],
            // [0.2, 0.2, 0.2],
        ];
        rawGraph.nodes.forEach((node) => {
            if (node.arrow.type === ArrowType.EMPTY || !node.valid) return;
            if (!InBounds(bounds, node.globalX, node.globalY)) return;
            let hash = 0;
            node.previous.forEach((prevNode) => {
                if (
                    prevNode.arrow.type === ArrowType.EMPTY ||
                    !prevNode.valid ||
                    IsArrowEntryPoint(prevNode.arrow.type)
                )
                    return;
                hash += prevNode.arrow.type + 1;
            });
            const index = hash % colors.length;
            const [r, g, b] = colors[index];
            renderColor(node, r, g, b, 0.5);
        });
    }

    private showDeadNodes(
        rawGraph: RawGraph,
        bounds: Bounds,
        renderColor: (
            node: RawNode,
            r: number,
            g: number,
            b: number,
            a: number,
        ) => void,
    ) {
        const entryPoints: RawNode[] = rawGraph.entryPoints;
        const reachableNodes = new Set<RawNode>();
        const reachQueue: RawNode[] = [...entryPoints];
        reachQueue.forEach((n) => reachableNodes.add(n));

        while (reachQueue.length > 0) {
            const current = reachQueue.shift()!;
            for (const nextNode of current.next) {
                if (
                    nextNode.valid &&
                    nextNode.arrow.type !== ArrowType.EMPTY &&
                    !reachableNodes.has(nextNode)
                ) {
                    reachableNodes.add(nextNode);
                    reachQueue.push(nextNode);
                }
            }
        }

        rawGraph.nodes.forEach((node) => {
            if (node.arrow.type === ArrowType.EMPTY || !node.valid) return;
            if (!InBounds(bounds, node.globalX, node.globalY)) return;
            if (!reachableNodes.has(node)) {
                renderColor(node, 0, 0, 0, 0.3);
            }
        });
    }
}
