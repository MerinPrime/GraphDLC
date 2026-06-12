import { CycleHeadType, type GraphCycle } from '../graph/ast/CycleTypes';
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
        graph: Graph,
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
                this.showRings(graph, bounds, renderColor);
                break;
            case DebugMode.SHOW_SIGNAL_PROPAGATION:
                this.showSignalPropagation(graph, bounds, renderColor);
                break;
            case DebugMode.SHOW_UNUSED_ARROWS:
                this.showDeadNodes(graph, bounds, renderColor);
                break;
            default:
                throw new Error('Method not implemented.');
        }
    }

    private showRings(
        graph: Graph,
        bounds: Bounds,
        renderColor: (
            node: GraphNode,
            r: number,
            g: number,
            b: number,
            a: number,
        ) => void,
    ) {
        const cycles = new Set<GraphCycle>();
        graph.getNodes().forEach((node) => {
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
        graph: Graph,
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
        graph.getNodes().forEach((node) => {
            if (node.type === ArrowType.EMPTY) return;
            if (!bounds.InBounds(node.globalX, node.globalY)) return;
            let hash = 0;
            node.backLinks.forEach((backLinkedNode) => {
                if (backLinkedNode.type === ArrowType.EMPTY) return;
                hash += backLinkedNode.type;
            });
            const index = hash % colors.length;
            const [r, g, b] = colors[index];
            renderColor(node, r, g, b, 0.5);
        });
    }

    private showDeadNodes(
        graph: Graph,
        bounds: Bounds,
        renderColor: (
            node: GraphNode,
            r: number,
            g: number,
            b: number,
            a: number,
        ) => void,
    ) {
        const entryPoints: GraphNode[] = graph
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
            for (const linkedNode of current.links) {
                if (
                    linkedNode.type !== ArrowType.EMPTY &&
                    !reachableNodes.has(linkedNode)
                ) {
                    reachableNodes.add(linkedNode);
                    reachQueue.push(linkedNode);
                }
            }
        }

        graph.getNodes().forEach((node) => {
            if (node.type === ArrowType.EMPTY) return;
            if (!bounds.InBounds(node.globalX, node.globalY)) return;
            if (!reachableNodes.has(node)) {
                renderColor(node, 0, 0, 0, 0.3);
            }
        });
    }
}
// TODO: incremental??
