import {GraphNode} from "./graph_node";
import {ENTRY_POINTS, getRelativeArrow, HANDLERS, NOT_ALLOWED_TO_CHANGE} from "./handlers";
import {Arrow} from "../api/arrow";
import {Chunk} from "../api/chunk";
import {GameMap} from "../api/game_map";
import {ArrowType} from "../api/arrow_type";
import {Graph} from "./graph";

const CHUNK_SIZE = 16;

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
                arrow.pending = false;
            });
        });

        this.graph.restarted = true;
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
                    let detectorNode = detectorArrow.graph_node;
                    if (!detectorNode) {
                        detectorNode = new GraphNode(detectorArrow, HANDLERS.get(detectorArrow.type)!);
                    }
                    
                    node.detectors.push(detectorNode);
                    if (!processed_arrows.has(detectorArrow)) {
                        to_compile_queue.push({ arrow: detectorArrow, x: ex, y: ey, chunk: eChunk });
                        processed_arrows.add(detectorArrow);
                    }
                }
            });
        }
        
        this.optimize_cycles();
    }

    optimize_cycles() {
        const cycles = new Set<Set<GraphNode>>();
        const visited = new Set<GraphNode>();
        const recursionStack = new Set<GraphNode>();
        const pathTrace = new Map<GraphNode, GraphNode>();

        function dfs(node: GraphNode) {
            visited.add(node);
            recursionStack.add(node);

            for (const neighbor of [...node.edges, ...node.detectors]) {
                if (recursionStack.has(neighbor)) {
                    const cycle = new Set<GraphNode>();
                    cycle.add(neighbor);

                    let currentNode = node;
                    while (currentNode !== neighbor) {
                        cycle.add(currentNode);
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

            recursionStack.delete(node);
        }

        for (const entry_point of this.graph.entry_points) {
            if (!visited.has(entry_point)) {
                dfs(entry_point);
            }
        this.restarted = false;
        temp_set = this.changed_nodes;
        this.changed_nodes = changed_nodes;
        Ну я думаю можно сделать чтобы 
         */
        
        console.log(cycles);
    }
    
    update(tick: number) {
        this.graph.update(tick);
    }
}