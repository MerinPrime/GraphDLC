import {Path} from "./path";
import {GraphNode} from "./graph_node";

export class PathPool {
    private pool: Path[] = [];
    
    get(pathLength: number, arrow: GraphNode, delta: number): Path {
        if (this.pool.length > 0) {
            const path = this.pool.pop()!;
            path.tick = pathLength;
            path.arrow = arrow;
            path.delta = delta;
            return path;
        }
        return new Path(pathLength, arrow, delta);
    }

    release(path: Path) {
        this.pool.push(path);
    }
}