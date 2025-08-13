import {GraphNode} from "./graph_node";
import {ArrowType} from "../api/arrow_type";
import {ADDITIONAL_UPDATE_ARROWS, ENTRY_POINTS, updateNode} from "./handlers";
import {Timer} from "./timer";
import {Path} from "./path";
import {PathPool} from "./path_pool";

export class Graph {
    entry_points: Set<GraphNode>;
    changed_nodes: Set<GraphNode>;
    temp_set: Set<GraphNode>;
    temp_cycle_update: Set<GraphNode>;
    temp_cycles_to_update: Set<Graph>;
    cycles_to_update: Set<Graph>;
    delayed_update: Set<GraphNode>;
    pathes: Array<Path>;
    timers: Array<Timer>;
    restarted: boolean;
    isCycle: boolean;
    cycleLength: number;
    lastUpdate: number;
    pathPool: PathPool;
    nextPathUpdateTick: number;
    lastPathUpdateTick: number;
    
    constructor(isCycle: boolean = false) {
        this.entry_points = new Set();
        this.changed_nodes = new Set();
        this.temp_set = new Set();
        this.temp_cycle_update = new Set();
        this.temp_cycles_to_update = new Set();
        this.cycles_to_update = new Set();
        this.delayed_update = new Set();
        this.pathes = [];
        this.timers = [];
        this.restarted = false;
        this.isCycle = isCycle;
        this.cycleLength = 0;
        this.lastUpdate = 0;
        this.pathPool = new PathPool();
        this.nextPathUpdateTick = Infinity;
        this.lastPathUpdateTick = 0;
    }
    
    clearSignals() {
        this.changed_nodes = new Set(this.entry_points);
        this.restarted = true;
        this.timers.forEach((timer) => {
            timer.tick = timer.offset;
            timer.restarted = true;
        });
        this.pathes.length = 0;
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
        this.clearTemp();
        const changed_nodes: Set<GraphNode> = this.temp_set;
        const temp_cycle_update: Set<GraphNode> = this.temp_cycle_update;
        const cycles_updated_this_tick = new Set<Graph>();

        if (this.cycles_to_update.size > 0) {
            const temp_cycles_to_update = this.temp_cycles_to_update;
            this.cycles_to_update.forEach((cycle) => {
                if (!cycles_updated_this_tick.has(cycle)) {
                    cycle.runUntil(tick);
                    cycles_updated_this_tick.add(cycle);
                }
                if (cycle.hasActiveEntryPoints()) {
                    temp_cycles_to_update.add(cycle);
                }
                return;
            });
            this.temp_cycles_to_update = this.cycles_to_update;
            this.cycles_to_update = temp_cycles_to_update;
        }
        if (this.timers.length > 0) {
            this.timers.forEach((timer) => {
                if (timer.tick === timer.length && !timer.restarted) {
                    timer.arrows.forEach((arrow) => {
                        arrow.arrow.signalsCount -= 1;
                        this.delayed_update.add(arrow);
                    });
                }
                timer.tick -= 1;
                if (timer.tick === 0) {
                    timer.tick = timer.length;
                    timer.arrows.forEach((arrow) => {
                        arrow.arrow.signalsCount += 1;
                        this.delayed_update.add(arrow);
                    });
                    timer.restarted = false;
                }
            });
        }
        if (this.pathes.length > 0) {
            if (this.nextPathUpdateTick <= tick) {
                let nextMinRemainingTicks = Infinity;
                let writeIndex = 0;
                for (let i = 0; i < this.pathes.length; i++) {
                    const path = this.pathes[i];
                    if (path.tick === tick) {
                        path.arrow.arrow.signalsCount += path.delta;
                        this.delayed_update.add(path.arrow);
                    } else {
                        nextMinRemainingTicks = Math.min(nextMinRemainingTicks, path.tick);
                        this.pathes[writeIndex] = path;
                        writeIndex++;
                    }
                }
                this.pathes.length = writeIndex;
                if (this.pathes.length === 0) {
                    this.nextPathUpdateTick = Infinity;
                } else {
                    this.nextPathUpdateTick = nextMinRemainingTicks;
                }
            }
            this.lastPathUpdateTick = tick;
        }
        this.changed_nodes.forEach(node => {
            const isChanged = node.arrow.signal !== node.arrow.lastSignal;
            if (node.pathLength !== -1) {
                const isActive = node.arrow.signal === node.handler!.active_signal;
                const delta = isActive ? 1 : -1;
                this.pathes.push(this.pathPool.get(tick + node.pathLength, node.edges[0], delta));
                this.nextPathUpdateTick = Math.min(this.nextPathUpdateTick, tick + node.pathLength);
                return;
            }
            if (isChanged) {
                const isActive = node.arrow.signal === node.handler!.active_signal;
                const delta = isActive ? 1 : -1;
                const isDelayed = node.isDelay && node.arrow.signal === 2;
                let i = 0;
                node.edges.forEach(edge => {
                    i++;
                    if (edge.cycle !== null && !this.isCycle) {
                        if (!cycles_updated_this_tick.has(edge.cycle)) {
                            edge.cycle.runUntil(tick);
                            cycles_updated_this_tick.add(edge.cycle);
                        }
                    }
                    if (edge.isDetector) {
                        if (node.isBlocker && i == 0) {
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
                        if (node.isBlocker) {
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
            if (isChanged && node.isAdditionalUpdate || this.restarted && node.isEntryPoint) {
                changed_nodes.add(node);
            }
            if (node.arrow.signal !== 0 && node.arrow.signalsCount === 0 && node.isButton) {
                changed_nodes.add(node);
            }
            if (node.isBruh && node.arrow.signalsCount > 0) {
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