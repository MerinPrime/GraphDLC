import {Chunk} from "./chunk";
import {CompiledMapGraph} from "../graph_compiler/compiled_map_graph";
import {ArrowType} from "./arrow_type";

export class GameMap {
    chunks: Map<string, Chunk>;
    compiled_graph: CompiledMapGraph | undefined;

    setArrowType(x: number, y: number, type: ArrowType);
    setArrowSignal(x: number, y: number, signal: number);
    setArrowRotation(x: number, y: number, direction: number);
    setArrowFlipped(x: number, y: number, flipped: boolean);
    resetArrow(x: number, y: number, force: boolean);
    removeArrow(x: number, y: number);
}