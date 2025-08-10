import {GraphNode} from "./graph_node";
import {
    ALLOWED_IN_BRANCH,
    ALLOWED_IN_BUTTON, ALLOWED_IN_PATH, ALLOWED_IN_PIXEL, ALLOWED_IN_PRETIMER, ALLOWED_IN_TIMER,
    ArrowHandler,
    ENTRY_POINTS,
    getRelativeArrow,
    HANDLERS, IS_BRANCH,
    NOT_ALLOWED_IN_CYCLE,
    NOT_ALLOWED_TO_CHANGE
} from "./handlers";
import {Arrow} from "../api/arrow";
import {Chunk} from "../api/chunk";
import {GameMap} from "../api/game_map";
import {ArrowType} from "../api/arrow_type";
import {Graph} from "./graph";
import {debugRing} from "./chunk_updates_patch";
import {Timer} from "./timer";
import * as path from "node:path";

const CHUNK_SIZE = 16;

export interface CycleInfo {
    arrows: Array<GraphNode>;
    endpoints: Array<GraphNode>;
    entrypoints: Array<GraphNode>;
    start: GraphNode | null;
    startIndex: number;
    end: GraphNode | null;
    endIndex: number;
    graph: Graph | null;
}

export class CompiledMapGraph {
    graph: Graph;
    
    constructor() {
        this.graph = new Graph();
    }

    compile_from(game_map: GameMap) {
        game_map.chunks.forEach((chunk: Chunk) => {
            chunk.arrows.forEach((arrow: Arrow) => {
                arrow.lastSignal = 0;
                arrow.signal = 0;
                arrow.signalsCount = 0;
                arrow.graph_node = undefined;
                arrow.blocked = 0;
            });
        });
        
        const to_compile_queue: { arrow: Arrow; x: number; y: number; chunk: Chunk }[] = [];
        const processed_arrows: Set<Arrow> = new Set();
        
        game_map.chunks.forEach((chunk: any, position: string) => {
            const arrows: Array<any> = chunk.arrows;
            for (let i_y = 0; i_y < CHUNK_SIZE; i_y++) {
                for (let i_x = 0; i_x < CHUNK_SIZE; i_x++) {
                    const arrow = arrows[i_x + i_y * CHUNK_SIZE];
                    if (ENTRY_POINTS.has(arrow.type)) {
                        to_compile_queue.push({ arrow, x: i_x, y: i_y, chunk });
                        processed_arrows.add(arrow);
                    }
                }
            }
        });
        
        while (to_compile_queue.length > 0) {
            const { arrow, x, y, chunk } = to_compile_queue.pop()!;

            if (!HANDLERS.has(arrow.type)) {
                console.warn(`Founded arrow with uncommon type: ${arrow.type}`)
                continue;
            }
            
            let node = arrow.graph_node;
            if (!node) {
                node = new GraphNode(arrow, HANDLERS.get(arrow.type)!);
            }

            if (ENTRY_POINTS.has(arrow.type)) {
                this.graph.entry_points.add(node);
            }
            this.graph.changed_nodes.add(node);
            
            node.handler!.get_edges(arrow, x, y, chunk).forEach((data) => {
                if (!data) return;
                const [edgeArrow, ex, ey, eChunk] = data;
                if (NOT_ALLOWED_TO_CHANGE.has(edgeArrow.type) && arrow.type !== ArrowType.BLOCKER) {
                    return;
                }

                if (!HANDLERS.has(edgeArrow.type)) {
                    console.warn(`Founded arrow with uncommon type: ${edgeArrow.type}`)
                    return;
                }
                let edgeNode = edgeArrow.graph_node;
                if (!edgeNode) {
                    edgeNode = new GraphNode(edgeArrow, HANDLERS.get(edgeArrow.type)!);
                }
                node.edges.push(edgeNode);
                edgeNode.back.push(node);
                if (!processed_arrows.has(edgeArrow)) {
                    to_compile_queue.push({ arrow: edgeArrow, x: ex, y: ey, chunk: eChunk });
                    processed_arrows.add(edgeArrow);
                }
            });
            
            const neighbours = [
                getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, -1, 0),
                getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, 1),
                getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 1, 0),
                getRelativeArrow(chunk, x, y, arrow.rotation, arrow.flipped, 0, -1),
            ];
            neighbours.forEach((data: any[] | undefined) => {
                if (!data) return;
                const [detectorArrow, ex, ey, eChunk] = data;
                const targetData = getRelativeArrow(eChunk, ex, ey, detectorArrow.rotation, detectorArrow.flipped, 1, 0);

                if (detectorArrow.type === ArrowType.DETECTOR && targetData &&
                    targetData[1] === x && targetData[2] === y && targetData[3] === chunk) {
                    let detectorNode: GraphNode = detectorArrow.graph_node;
                    if (!detectorNode) {
                        detectorNode = new GraphNode(detectorArrow, HANDLERS.get(detectorArrow.type)!);
                    }
                    
                    node.edges.push(detectorNode);
                    detectorNode.back.push(node);
                    if (!processed_arrows.has(detectorArrow)) {
                        to_compile_queue.push({ arrow: detectorArrow, x: ex, y: ey, chunk: eChunk });
                        processed_arrows.add(detectorArrow);
                    }
                }
            });
        }
        
        this.optimize_branches();
        this.optimize_cycles();
        // this.optimize_buttons();
        this.optimize_pixels();
        this.optimize_pathes();
        this.graph.changed_nodes = new Set(this.graph.entry_points);
        this.graph.restarted = true;
    }

    optimize_pathes() {
        const foundPaths: GraphNode[][] = [];
        const visitedOrQueued = new Set<GraphNode>();
        const queue: GraphNode[] = [];

        const scheduleNode = (node: GraphNode) => {
            if (!visitedOrQueued.has(node)) {
                visitedOrQueued.add(node);
                queue.push(node);
            }
        };

        this.graph.entry_points.forEach(scheduleNode);

        while (queue.length > 0) {
            let currentNode = queue.shift()!;

            if (!ALLOWED_IN_PATH.has(currentNode.arrow.type)) {
                currentNode.edges.forEach(scheduleNode);
                continue;
            }

            const currentPath: GraphNode[] = [];
            let pathWalker: GraphNode | undefined = currentNode;

            while (
                pathWalker &&
                ALLOWED_IN_PATH.has(pathWalker.arrow.type) &&
                pathWalker.edges.length === 1 &&
                pathWalker.back.length === 1
                ) {
                currentPath.push(pathWalker);
                pathWalker = pathWalker.edges[0];

                if (currentPath.includes(pathWalker)) {
                    pathWalker = undefined;
                }
            }

            if (pathWalker && ALLOWED_IN_PATH.has(pathWalker.arrow.type)) {
                currentPath.push(pathWalker);
            }

            if (currentPath.length > 0) {
                foundPaths.push(currentPath);
            }

            if (pathWalker) {
                pathWalker.edges.forEach(scheduleNode);
            }
        }
        
        foundPaths.forEach(path => {
            if (path.length < 6)
                return;
            if (path.some((edge) => edge.cycle !== null))
                return;
            path[0].pathLength = path.length - 2;
            path[0].edges = [path[path.length - 1]];
        });
    }

    optimize_branches() {
        const visited = new Set<GraphNode>();
        const queue = [...this.graph.entry_points];
        const branches = new Array<GraphNode>();

        while (queue.length > 0) {
            const node = queue.pop()!;
            if (visited.has(node)) {
                continue;
            }
            if (node.edges.length > 1) {
                branches.push(node);
            }
            queue.push(...node.edges);
            visited.add(node);
        }

        branches.forEach((branch) => {
            let branchQueue = [...branch.edges];
            let branchTempQueue = new Array<GraphNode>();
            const visited = new Set<GraphNode>();
            let i = 0;
            while (true) {
                const validBranch = branchQueue.every((edge) => ALLOWED_IN_BRANCH.has(edge.arrow.type) && edge.edges.length === 1 && edge.back.length === 1);
                if (!validBranch) {
                    if (branchTempQueue.length === 0) {
                        return;
                    }
                    break;
                }
                branchTempQueue.length = 0;
                for (let edge of branchQueue) {
                    if (visited.has(edge)) {
                        return;
                    }
                    branchTempQueue.push(...edge.edges);
                    visited.add(edge);
                }
                const beb = branchQueue;
                branchQueue = branchTempQueue;
                branchTempQueue = beb;
                i++;
            }
            branchQueue = branchTempQueue;
            if (i < 3) {
                return;
            }
            branch.edges = [branch.edges[0]];
            let nextEdge = branch;
            for (let j = 0; j < i - 1; j++) {
                nextEdge = nextEdge.edges[0];
            }
            nextEdge.edges = branchQueue;
        });
    }
    
    optimize_pixels() {
        const visited = new Set<GraphNode>();
        const cache = new Map<GraphNode, boolean>();
        const pixelNodes: GraphNode[] = [];

        function dfs(node: GraphNode): boolean {
            if (cache.has(node))
                return cache.get(node)!;
            if (visited.has(node)) {
                cache.set(node, false);
                return false;
            }

            visited.add(node);
            let isPixel = ALLOWED_IN_PIXEL.has(node.arrow.type);

            if (node.edges.length !== 0) {
                const tempPixelNodes = []
                for (const edge of node.edges) {
                    const isNodePixel = dfs(edge);
                    if (isNodePixel) {
                        tempPixelNodes.push(edge);
                    }
                    isPixel = isPixel && isNodePixel;
                }
                if (!isPixel) {
                    pixelNodes.push(...tempPixelNodes);
                }
            }

            visited.delete(node);
            cache.set(node, isPixel);
            return isPixel;
        }

        for (const entry of this.graph.entry_points) {
            dfs(entry);
        }

        pixelNodes.forEach((pixelNode) => {
            const pixelEdges = new Set<GraphNode>();
            const pixelQueue: GraphNode[] = [...pixelNode.edges];
            while (pixelQueue.length > 0) {
                const pixelEdge = pixelQueue.pop()!;
                pixelEdges.add(pixelEdge);
                pixelQueue.push(...pixelEdge.edges);
                pixelEdge.edges = [];
            }
            pixelNode.edges = [...pixelEdges];
        });
    }

    optimize_buttons() {
        const visited = new Set();
        this.graph.entry_points.forEach((entryPoint) => {
            if (entryPoint.arrow.type !== ArrowType.BRUH_BUTTON) {
                return;
            }
            if (entryPoint.edges.length === 0) {
                return;
            }
            const queue: Array<GraphNode> = [...entryPoint.back];
            visited.clear();
            while (queue.length > 0) {
                const edge = queue.pop()!;
                if (visited.has(edge)) {
                    return;
                }
                if (edge.buttonEdge !== null) {
                    continue;
                }
                visited.add(edge);
                for (let i = 0; i < edge.back.length; i++) {
                    if (!ALLOWED_IN_BUTTON.has(edge.back[i].arrow.type)) {
                        return;
                    }
                    queue.push(edge.back[i]);
                }
            }
            let edge = entryPoint.edges[0];
            if (edge.buttonEdge !== null) {
                entryPoint.buttonEdge = edge;
                return;
            }
            visited.clear();
            while (true) {
                if (edge.edges.length === 0) {
                    break;
                }
                if (visited.has(edge)) {
                    return;
                }
                visited.add(edge);
                if (!ALLOWED_IN_BUTTON.has(edge.edges[0].arrow.type)) {
                    break;
                }
                edge = edge.edges[0];
            }
            entryPoint.buttonEdge = edge;
        });
    }
    
    optimize_cycles() {
        const cycles = new Set<Array<GraphNode>>();
        const visited = new Set<GraphNode>();
        const recursionStack = new Array<GraphNode>();
        const pathTrace = new Map<GraphNode, GraphNode>();

        function dfs(node: GraphNode, allowed: Set<GraphNode> = new Set()) {
            visited.add(node);
            recursionStack.push(node);

            for (const neighbor of node.edges) {
                if (!allowed.has(neighbor) && allowed.size !== 0) {
                    continue;
                }
                if (recursionStack.indexOf(neighbor) !== -1) {
                    const cycle = new Array<GraphNode>();
                    cycle.push(neighbor);

                    let currentNode = node;
                    while (currentNode !== neighbor) {
                        cycle.push(currentNode);
                        currentNode = pathTrace.get(currentNode)!;
                    }
                    cycles.add(cycle);
                    continue;
                }

                if (!visited.has(neighbor)) {
                    pathTrace.set(neighbor, node);
                    dfs(neighbor);
                }
            }

            recursionStack.pop();
        }

        for (const entry_point of this.graph.entry_points) {
            if (!visited.has(entry_point)) {
                dfs(entry_point);
            }
        }
        
        let validCycles = new Set<CycleInfo>();
        // TODO: удаление вложенных циклов может неправильно работать если вложенный цикл или внешний цикл не являются
        //       циклами хотя по идее вложенный цикл даже если нерабочий в любом случае подразумевает что цикл непростой
        //       и он тоже нерабочий
        cycles.forEach((cycle) => {
            let isValid = true;
            const info: CycleInfo = {arrows: cycle, endpoints: [], entrypoints: [], start: null, startIndex: 0, end: null, endIndex: 0, graph: null};
            for (let i = 0; i < cycle.length; i++) {
                const cycle_arrow = cycle[i];
                const next_arrow = cycle[i - 1 > 0 ? i - 1 : cycle.length - 1];
                const prev_arrow = cycle[i + 1 < cycle.length ? i + 1 : 0];
                if (debugRing) {
                    cycle_arrow.arrow.signal = 5;
                }
                if (cycle_arrow.edges.length > 1) {
                    cycle_arrow.edges.forEach((edge) => {
                        if (edge == next_arrow)
                            return;
                        if (debugRing) {
                            edge.arrow.signal = 6;
                        }
                    });
                    if (debugRing) {
                        cycle_arrow.arrow.signal = 7;
                    }
                    info.endpoints.push(cycle_arrow);
                }
                if (cycle_arrow.back.length > 1) {
                    cycle_arrow.back.forEach((edge) => {
                        if (edge == prev_arrow)
                            return;
                        if (debugRing) {
                            edge.arrow.signal = 6;
                        }
                    });
                    if (debugRing) {
                        cycle_arrow.arrow.signal = 4;
                    }
                    info.entrypoints.push(cycle_arrow);
                }
                if (NOT_ALLOWED_IN_CYCLE.has(cycle_arrow.arrow.type)) {
                    isValid = false;
                    if (debugRing) {
                        cycle_arrow.arrow.signal = 1;
                    }
                }
            }
            let endPointIndex = -1;
            for (let i = 0; i < cycle.length; i++) {
                const cycle_arrow = cycle[i];
                if (info.endpoints.indexOf(cycle_arrow) !== -1) {
                    endPointIndex = i;
                }
            }
            for (let i = cycle.length; i > 0; i--) {
                const cycle_arrow = cycle[(i + endPointIndex) % cycle.length];
                if (info.entrypoints.indexOf(cycle_arrow) !== -1) {
                    if (info.start === null) {
                        info.start = cycle_arrow;
                        info.startIndex = (i + endPointIndex) % cycle.length;
                    }
                    info.end = cycle_arrow;
                    info.endIndex = (i + endPointIndex) % cycle.length;
                }
            }
            isValid = isValid && info.endpoints.length > 0;
            if (isValid) {
                validCycles.add(info);
            }
        });

        let newCycles = validCycles;
        validCycles = new Set();

        newCycles.forEach((cycleInfo) => {
            let isValid = true;
            const setA = new Set(cycleInfo.arrows);
            validCycles.forEach((b) => {
                if (!isValid)
                    return;
                if (b === cycleInfo)
                    return;
                if (setA.size < b.arrows.length) {
                    return;
                }
                const hasIntersection = b.arrows.some(node => setA.has(node));
                if (hasIntersection && isValid) {
                    isValid = false;
                    return;
                }
            });
            if (isValid) {
                validCycles.add(cycleInfo);
            }
        });
        
        newCycles = validCycles;
        validCycles = new Set();
        const timerCycles = new Map<string, Timer>();

        newCycles.forEach((cycleInfo) => {
            let isValid = true;
            cycleInfo.endpoints.forEach((endpoint) => {
                endpoint.edges.forEach((edge) => {
                    if (cycleInfo.arrows.includes(edge))
                        return;
                    if (edge.arrow.type !== ArrowType.LOGIC_AND) {
                        isValid = false;
                    }
                })
            });
            if (isValid) {
                cycleInfo.arrows.forEach((arrow) => {
                    if (isValid)
                        isValid = arrow.arrow.type !== ArrowType.DELAY;
                });
            }
            if (isValid) {
                validCycles.add(cycleInfo);
            }
        });
        newCycles.forEach((cycleInfo) => {
            let isValid = cycleInfo.entrypoints.length === 1;
            if (isValid) {
                cycleInfo.arrows.forEach((arrow) => {
                    if (isValid)
                        isValid = ALLOWED_IN_TIMER.has(arrow.arrow.type);
                })
            }
            if (!isValid)
                return;
            let timerOffset = 2;
            let external: GraphNode | undefined = undefined;
            if (isValid) {
                let prevBack: GraphNode | undefined = undefined;
                let externalCount = 0;
                cycleInfo.entrypoints.forEach((point) => {
                    const externalBack = point.back.filter((edge) => !cycleInfo.arrows.includes(edge));
                    if (isValid) {
                        isValid = externalBack.length === 1;
                        if (externalBack.length === 1) {
                            prevBack = point;
                            external = externalBack[0];
                        }
                    }
                    externalCount += externalBack.length;
                });
                if (isValid)
                    isValid = externalCount === 1
                if (!isValid || external === undefined || prevBack === undefined) {
                    return;
                }
                let nextBack: GraphNode = external!;
                while (isValid && nextBack.arrow.type !== ArrowType.RED_IMPULSE) {
                    if (!ALLOWED_IN_PRETIMER.has(nextBack.arrow.type)) {
                        isValid = false;
                        break;
                    }
                    if (nextBack.back.length !== 1) {
                        isValid = false;
                        break;
                    }
                    timerOffset += 1;
                    if (nextBack.arrow.type === ArrowType.DELAY) {
                        timerOffset += 1;
                    }
                    prevBack = nextBack;
                    nextBack = nextBack.back[0];
                }
                if (!isValid) {
                    return;
                }
                nextBack.edges.splice(nextBack.edges.indexOf(prevBack), 1);
            }
            const endPoints = new Map<GraphNode, number>();

            let timerDelay = 0;
            for (let i = 0; i < cycleInfo.arrows.length; i++) {
                const cycle_arrow = cycleInfo.arrows[(cycleInfo.arrows.length + cycleInfo.startIndex - i) % cycleInfo.arrows.length];
                timerDelay += 1;
                if (cycle_arrow.arrow.type === ArrowType.DELAY) {
                    timerDelay += 1;
                }
                if (cycleInfo.endpoints.includes(cycle_arrow)) {
                    cycle_arrow.edges.forEach((edge) => {
                        if (cycleInfo.arrows.includes(edge)) {
                            return;
                        }
                        endPoints.set(edge, timerDelay + timerOffset);
                    });
                }
            }
            [...endPoints.entries()].forEach(([point, offset]) => {
                const key = `${timerDelay}|${offset}`;
                if (!timerCycles.has(key)) {
                    timerCycles.set(key, new Timer(timerDelay, offset, [point]));
                } else {
                    const existing = timerCycles.get(key)!;
                    existing.arrows.push(point);
                }
            });
        });

        this.graph.timers = Array.from(timerCycles.values());
        
        validCycles.forEach((cycleInfo) => {
            let graph = new Graph(true);
            cycleInfo.entrypoints.forEach((entryPoint) => {
                entryPoint.back.forEach((edge) => {
                    if (cycleInfo.arrows.includes(edge))
                        return;
                    graph.entry_points.add(edge);
                })
            });
            cycleInfo.arrows.forEach((arrow) => {
                arrow.cycle = graph;
            });
            cycleInfo.graph = graph;
            for (let i = 0; i < cycleInfo.arrows.length; i++) {
                const endPoint = cycleInfo.arrows[i];
                if (cycleInfo.endpoints.indexOf(endPoint) === -1) {
                    continue;
                }
                endPoint.edges.forEach((edge) => {
                    if (cycleInfo.arrows.includes(edge))
                        return;
                    edge.cycleOffset = (cycleInfo.arrows.length + i - 1) % cycleInfo.arrows.length;
                    edge.cycleInfo = cycleInfo;
                    endPoint.edges.splice(endPoint.edges.indexOf(edge), 1);
                })
            }
            graph.cycleLength = cycleInfo.arrows.length;
        });
        
        /*
        Надо сделать чтобы цикл мог содержать только нормальные стрелочки
        Чтобы не было такого что сложный процессор посчитался обычным циклом
        Также надо сделать ограничение например минимум 4 стрелочки в цикле
        Также надо как то делать чтобы оптимизировались циклы которые не являются таймерами
        
        Ебать я умный нахуй пиздец бля
        Можно сделать совместить 2 идеи:
        1. Идея рыбы - Сигналы в кольце хранить одним целым например 011100011101
        2. Идея гулга - JIT компиляция, сделать чтобы стрелочка брала n сигнал из кольца вместо того чтобы полностью шёл путь
        
        Я думаю надо хранить сигналы типо полной истории изменения включая количество тиков прошедших с изменения
        Бля ну в таком случае я хз как сделать чтобы например память в которой сигнал через XOR изменяется надо как то улучшить
        Ну я думаю можно сделать чтобы 
         */
    }
    
    update(tick: number) {
        this.graph.update(tick);
    }
}