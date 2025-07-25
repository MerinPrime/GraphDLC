import {GraphNode} from "./graph_node";
import {ArrowType} from "../api/arrow_type";
import {ADDITIONAL_UPDATE_ARROWS, ENTRY_POINTS} from "./handlers";

export class Graph {
    entry_points: Set<GraphNode>;
    changed_nodes: Set<GraphNode>;
    temp_set: Set<GraphNode>;
    restarted: boolean;
    
    constructor() {
        this.entry_points = new Set();
        this.changed_nodes = new Set();
        this.temp_set = new Set();
        this.restarted = false;
    }
    
    update(tick: number) {
        let changed_nodes: Set<GraphNode> = this.temp_set;
        changed_nodes.clear();
        this.changed_nodes.forEach(node => {
            const isChanged = node.arrow.signal !== node.arrow.lastSignal;
            if (isChanged && !node.arrow.pending) {
                const isActive = node.arrow.signal === node.handler!.active_signal;
                const delta = +(isActive) * 2 - 1;
                const isBlocker = node.arrow.type === ArrowType.BLOCKER;
                node.edges.forEach(edge => {
                    if (isBlocker) {
                        edge.arrow.blocked += delta;
                    } else {
                        edge.arrow.signalsCount += delta;
                    }
                    changed_nodes.add(edge);
                });
            }
            if (isChanged) {
                node.detectors.forEach(edge => {
                    edge.arrow.detectorSignal = node.arrow.signal;
                    changed_nodes.add(edge);
                });
            }
            if (isChanged && ADDITIONAL_UPDATE_ARROWS.has(node.arrow.type) || this.restarted && ENTRY_POINTS.has(node.arrow.type)) {
                changed_nodes.add(node);
            }
            if (node.arrow.signal !== 0 && node.arrow.signalsCount === 0 && (node.arrow.type === ArrowType.BUTTON || node.arrow.type === ArrowType.BRUH_BUTTON)) {
                changed_nodes.add(node);
            }
            if (node.arrow.type === ArrowType.RANDOM && node.arrow.signalsCount > 0) {
                changed_nodes.add(node);
            }
            node.arrow.lastType = node.arrow.type;
            node.arrow.lastSignal = node.arrow.signal;
            node.arrow.lastRotation = node.arrow.rotation;
            node.arrow.lastFlipped = node.arrow.flipped;
        });
        changed_nodes.forEach(node => {
            if (node.arrow.blocked > 0) {
                node.arrow.signal = 0;
            }
            else {
                node.handler!.update(node.arrow);
            }
        });
        this.restarted = false;
        this.temp_set = this.changed_nodes;
        this.changed_nodes = changed_nodes;
    }
}