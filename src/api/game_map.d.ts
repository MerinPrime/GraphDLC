import {Chunk} from "./chunk";
import {CompiledMapGraph} from "../graph_compiler/compiled_map_graph";

export interface GameMap {
    chunks: Map<string, Chunk>;
    compiled_graph: CompiledMapGraph;
}