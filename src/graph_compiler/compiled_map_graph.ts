import {GraphNode} from "./graph_node";
import {
    ArrowHandler,
    ENTRY_POINTS,
    getRelativeArrow,
    HANDLERS,
    NOT_ALLOWED_IN_RING,
    NOT_ALLOWED_TO_CHANGE
} from "./handlers";
import {Arrow} from "../api/arrow";
import {Chunk} from "../api/chunk";
import {GameMap} from "../api/game_map";
import {ArrowType} from "../api/arrow_type";
import {Graph} from "./graph";
import {debugRing} from "./chunk_updates_patch";

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
        
        this.optimize_cycles();
        this.graph.changed_nodes = new Set(this.graph.entry_points);
        this.graph.restarted = true;
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
        
        const validCycles = new Set<CycleInfo>();
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
                // If this is timer delay arrow is allowed but how to check?
                // I think need to save isDelayUsed and check is it timer if not set isValid = isValid && !isDelayUsed
                // У Alex_Ilya в кольцевой памяти используются блокеры, надо преобразовывать блокеры в AND
                if (NOT_ALLOWED_IN_RING.has(cycle_arrow.arrow.type)) {
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
                        info.startIndex = i;
                    }
                    info.end = cycle_arrow;
                    info.endIndex = i;
                }
            }
            if (isValid) {
                const setA = new Set(cycle);
                cycles.forEach((b) => {
                    if (b === cycle)
                        return;
                    const hasIntersection = b.some(node => setA.has(node));
                    if (hasIntersection && isValid) {
                        isValid = false;
                        return;
                    }
                });
            }
            isValid = isValid && info.endpoints.length > 0;
            if (isValid) {
                validCycles.add(info);
            }
        });
        
        validCycles.forEach((cycleInfo) => {
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
            if (!isValid) {
                return;
            }
            
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