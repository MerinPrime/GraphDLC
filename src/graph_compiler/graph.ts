import {GraphNode} from "./graph_node";
import {updateNode} from "./handlers";
import {Timer} from "./timer";
import {Path} from "./path";
import {PathPool} from "./path_pool";
import {Cycle} from "./cycle";
import {CycleHeadType} from "./ast/cycle/cycleHeadType";

export class Graph {
    entry_points: Set<GraphNode>;
    changed_nodes: Set<GraphNode>;
    temp_set: Set<GraphNode>;
    temp_cycle_update: Set<GraphNode>;
    temp_cycles_to_update: Set<Cycle>;
    cycles_to_update: Set<Cycle>;
    delayed_update: Set<GraphNode>;
    paths: Array<Path>;
    timers: Array<Timer>;
    restarted: boolean;
    pathPool: PathPool;
    nextPathUpdateTick: number;
    lastPathUpdateTick: number;
    
    cycles: Cycle[];
    
    constructor(cycles: Cycle[]) {
        this.entry_points = new Set();
        this.changed_nodes = new Set();
        this.temp_set = new Set();
        this.temp_cycle_update = new Set();
        this.temp_cycles_to_update = new Set();
        this.cycles_to_update = new Set();
        this.delayed_update = new Set();
        this.paths = [];
        this.timers = [];
        this.restarted = false;
        this.pathPool = new PathPool();
        this.nextPathUpdateTick = Infinity;
        this.lastPathUpdateTick = 0;
        this.cycles = cycles;
    }
    
    clearSignals() {
        this.changed_nodes = new Set(this.entry_points);
        this.restarted = true;
        this.timers.forEach((timer) => {
            timer.tick = timer.offset;
            timer.restarted = true;
        });
        this.cycles.forEach((cycle) => {
            cycle.activeEntryPoints.clear();
        });
        this.cycles_to_update.clear();
        this.paths.length = 0;
    }
    
    clearTemp() {
        this.temp_set.clear();
        this.temp_cycle_update.clear();
        this.temp_cycles_to_update.clear();
    }
    
    update(tick: number) {
        this.clearTemp();
        const changed_nodes: Set<GraphNode> = this.temp_set;

        if (this.cycles_to_update.size > 0) {
            const temp_cycles_to_update = this.temp_cycles_to_update;
            this.cycles_to_update.forEach((cycle) => {
                const anyActive = cycle.update(tick);
                if (anyActive) {
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
        if (this.paths.length > 0) {
            if (this.nextPathUpdateTick <= tick) {
                let nextMinRemainingTicks = Infinity;
                let writeIndex = 0;
                for (let i = 0; i < this.paths.length; i++) {
                    const path = this.paths[i];
                    if (path.tick === tick) {
                        path.arrow.arrow.signalsCount += path.delta;
                        this.delayed_update.add(path.arrow);
                    } else {
                        nextMinRemainingTicks = Math.min(nextMinRemainingTicks, path.tick);
                        this.paths[writeIndex] = path;
                        writeIndex++;
                    }
                }
                this.paths.length = writeIndex;
                if (this.paths.length === 0) {
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
                this.paths.push(this.pathPool.get(tick + node.pathLength, node.edges[0], delta));
                this.nextPathUpdateTick = Math.min(this.nextPathUpdateTick, tick + node.pathLength);
                return;
            }
            if (isChanged) {
                const isActive = node.arrow.signal === node.handler!.active_signal;
                const delta = isActive ? 1 : -1;
                const isDelayed = node.isDelay && node.arrow.signal === 2;
                let i = -1;
                // BLOCKER WORKS INCORRECTLY
                // IF BLOCKER NOT BLOCKING CHANGE BLOCKER TYPE TO RED_ARROW
                node.edges.forEach(edge => {
                    i++;
                    if (edge.isDetector) {
                        if (node.isBlocker && i == 0) {
                            edge.arrow.blocked! += delta;
                        }
                        else {
                            edge.arrow.signalsCount = node.arrow.signal !== 0 ? 1 : 0;
                        }
                    } else if (!isDelayed) {
                        if (node.isBlocker) {
                            edge.arrow.blocked! += delta;
                        } else {
                            edge.arrow.signalsCount += delta;
                        }
                    } else {
                        return
                    }
                    if (edge.newCycle !== null && edge.cycleHeadType !== CycleHeadType.READ) {
                        this.temp_cycle_update.add(edge);
                    } else {
                        changed_nodes.add(edge);
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
        this.temp_cycle_update.forEach(node => {
            updateNode(node, tick);
            const isChanged = node.arrow.signal !== node.arrow.lastSignal;
            if (isChanged) {
                const isActive = node.arrow.signal === node.handler!.active_signal;
                if (isActive) {
                    node.newCycle!.activeEntryPoints.add(node);
                    this.cycles_to_update.add(node.newCycle!);
                } else {
                    node.newCycle!.activeEntryPoints.delete(node);
                }
            }
            node.arrow.lastType = node.arrow.type;
            node.arrow.lastSignal = node.arrow.signal;
            node.arrow.lastRotation = node.arrow.rotation;
            node.arrow.lastFlipped = node.arrow.flipped;
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