import { CycleHeadType, type RawCycle } from '../graph/ast/CycleTypes';
import type { Graph } from '../graph/ast/Graph';
import type { GraphNode } from '../graph/ast/GraphNode';
import {
    DebugMode,
    DebugModeSetting,
} from '../settings/instances/tools/DebugModeSetting';
import { ArrowType, IsArrowEntryPoint } from '../utils/ArrowType';
import type { Bounds } from '../utils/Bounds';

export class GraphDebug {
    public colorizeDebug(
        rawGraph: Graph,
        bounds: Bounds,
        renderColor: (
            node: GraphNode,
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
        rawGraph: Graph,
        bounds: Bounds,
        renderColor: (
            node: GraphNode,
            r: number,
            g: number,
            b: number,
            a: number,
        ) => void,
    ) {
        const cycles = new Set<RawCycle>();
        rawGraph.getNodes().forEach((node) => {
            if (!node.cycleRef) return;
            cycles.add(node.cycleRef);
        });
        cycles.forEach((cycle) => {
            cycle.nodes.forEach((node) => {
                if (bounds.InBounds(node.globalX, node.globalY))
                    renderColor(node, 0.8, 0.2, 0.8, 0.25);
            });
            cycle.heads.forEach((node) => {
                if (!bounds.InBounds(node.globalX, node.globalY)) return;
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
        rawGraph: Graph,
        bounds: Bounds,
        renderColor: (
            node: GraphNode,
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
        ];
        rawGraph.getNodes().forEach((node) => {
            if (node.type === ArrowType.EMPTY) return;
            if (!bounds.InBounds(node.globalX, node.globalY)) return;
            let hash = 0;
            node.previous.forEach((prevNode) => {
                if (prevNode.type === ArrowType.EMPTY) return;
                hash += prevNode.type;
            });
            const index = hash % colors.length;
            const [r, g, b] = colors[index];
            renderColor(node, r, g, b, 0.5);
        });
    }

    private showDeadNodes(
        rawGraph: Graph,
        bounds: Bounds,
        renderColor: (
            node: GraphNode,
            r: number,
            g: number,
            b: number,
            a: number,
        ) => void,
    ) {
        const entryPoints: GraphNode[] = rawGraph
            .getNodes()
            .filter((node) => IsArrowEntryPoint(node.type));
        const reachableNodes = new Set<GraphNode>();
        const reachQueue: GraphNode[] = [...entryPoints];
        reachQueue.forEach((n) => {
            reachableNodes.add(n);
        });

        while (reachQueue.length > 0) {
            const current = reachQueue.shift();
            if (current === undefined) {
                break;
            }
            for (const nextNode of current.next) {
                if (
                    nextNode.type !== ArrowType.EMPTY &&
                    !reachableNodes.has(nextNode)
                ) {
                    reachableNodes.add(nextNode);
                    reachQueue.push(nextNode);
                }
            }
        }

        rawGraph.getNodes().forEach((node) => {
            if (node.type === ArrowType.EMPTY) return;
            if (!bounds.InBounds(node.globalX, node.globalY)) return;
            if (!reachableNodes.has(node)) {
                renderColor(node, 0, 0, 0, 0.3);
            }
        });
    }
}
