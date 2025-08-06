import {GraphNode} from "./graph_node";
import {ArrowType} from "../api/arrow_type";
import {ADDITIONAL_UPDATE_ARROWS, ENTRY_POINTS, updateNode} from "./handlers";

export class Graph {
    entry_points: Set<GraphNode>;
    changed_nodes: Set<GraphNode>;
    temp_set: Set<GraphNode>;
    temp_cycle_update: Set<GraphNode>;
    temp_cycles_to_update: Set<Graph>;
    cycles_to_update: Set<Graph>;
    delayed_update: Set<GraphNode>;
    restarted: boolean;
    isCycle: boolean;
    cycleLength: number;
    lastUpdate: number;
    
    constructor(isCycle: boolean = false) {
        this.entry_points = new Set();
        this.changed_nodes = new Set();
        this.temp_set = new Set();
        this.temp_cycle_update = new Set();
        this.temp_cycles_to_update = new Set();
        this.cycles_to_update = new Set();
        this.delayed_update = new Set();
        this.restarted = false;
        this.isCycle = isCycle;
        this.cycleLength = 0;
        this.lastUpdate = 0;
    }
    
    clearTemp() {
        this.temp_set.clear();
        this.temp_cycle_update.clear();
        this.temp_cycles_to_update.clear();
    }
    
    runUntil(tick: number) {
        const updateTicks = (tick - this.lastUpdate) % this.cycleLength;
        for (let i = 0; i < updateTicks; i++) {
            this.update(this.lastUpdate + i);
        }
        this.lastUpdate = tick;
    }

    hasActiveEntryPoints() {
        for (let entryPoint of this.entry_points) {
            if (entryPoint.arrow.signal === entryPoint.handler?.active_signal) {
                return true;
            }
        }
        return false;
    }
    
    update(tick: number) {
        const changed_nodes: Set<GraphNode> = this.temp_set;
        const temp_cycle_update: Set<GraphNode> = this.temp_cycle_update;
        const temp_cycles_to_update = this.temp_cycles_to_update;
        this.clearTemp();
        this.cycles_to_update.forEach((cycle) => {
            cycle.runUntil(tick);
            if (cycle.hasActiveEntryPoints()) {
                temp_cycles_to_update.add(cycle);
            }
            return;
        });
        this.temp_cycles_to_update = this.cycles_to_update;
        this.cycles_to_update = temp_cycles_to_update;
        this.changed_nodes.forEach(node => {
            if (node.display) {
                return;
            }
            const isChanged = node.arrow.signal !== node.arrow.lastSignal;
            if (isChanged) {
                const isActive = node.arrow.signal === node.handler!.active_signal;
                const delta = isActive ? 1 : -1;
                const isBlocker = node.arrow.type === ArrowType.BLOCKER;
                const isDelayed = node.arrow.type === ArrowType.DELAY && node.arrow.signal === 2;
                let i = 0;
                node.edges.forEach(edge => {
                    i++;
                    if (edge.cycle !== null && !this.isCycle) {
                        const updateDelta = (tick - edge.cycle.lastUpdate) % edge.cycle.cycleLength;
                        for (let i = 0; i < updateDelta; i++) {
                            edge.cycle.update(edge.cycle.lastUpdate + i);
                        }
                        edge.cycle.lastUpdate = tick;
                    }
                    if (edge.arrow.type === ArrowType.DETECTOR) {
                        if (isBlocker && i == 0) {
                            edge.arrow.blocked += delta;
                        }
                        else {
                            edge.arrow.signalsCount = node.arrow.signal !== 0 ? 1 : 0;
                        }
                        if (edge.cycle !== null && !this.isCycle) {
                            edge.cycle.changed_nodes.add(edge);
                            temp_cycle_update.add(edge);
                            this.cycles_to_update.add(edge.cycle);
                        } else {
                            changed_nodes.add(edge);
                        }
                    } else if (!isDelayed) {
                        if (isBlocker) {
                            edge.arrow.blocked += delta;
                        } else {
                            edge.arrow.signalsCount += delta;
                        }
                        if (edge.cycle !== null && !this.isCycle) {
                            edge.cycle.changed_nodes.add(edge);
                            temp_cycle_update.add(edge);
                            this.cycles_to_update.add(edge.cycle);
                        } else {
                            changed_nodes.add(edge);
                        }
                    }
                });
            }
            if (isChanged && ADDITIONAL_UPDATE_ARROWS.has(node.arrow.type) || this.restarted && ENTRY_POINTS.has(node.arrow.type)) {
                changed_nodes.add(node);
            }
            if (node.arrow.signal !== 0 && node.arrow.signalsCount === 0 && (node.arrow.type === ArrowType.BUTTON || node.arrow.type === ArrowType.BRUH_BUTTON)) {
                changed_nodes.add(node);
            }
            if (node.arrow.type === ArrowType.RANDOM && node.arrow.signalsCount > 0 || node.arrow.type === ArrowType.LOGIC_AND && node.cycleInfo !== null && node.arrow.signalsCount > 0) {
                changed_nodes.add(node);
            }
            node.arrow.lastType = node.arrow.type;
            node.arrow.lastSignal = node.arrow.signal;
            node.arrow.lastRotation = node.arrow.rotation;
            node.arrow.lastFlipped = node.arrow.flipped;
        });
        this.temp_set = this.changed_nodes;
        this.changed_nodes = changed_nodes;
        this.changed_nodes.forEach(node => {
            updateNode(node, tick);
        });
        temp_cycle_update.forEach(node => {
            updateNode(node, tick);
        });
        this.delayed_update.forEach(node => {
            updateNode(node, tick);
            if (node.arrow.signal !== node.arrow.lastSignal) {
                this.changed_nodes.add(node);
            }
        });
        this.restarted = false;
        this.delayed_update.clear();
    }
}