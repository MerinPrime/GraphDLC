import type { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import type { ITask } from 'src/core/task/ITask';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { DebuggerMode } from '../DebuggerMode';
import type { DebugColor, INodeDebugData } from '../types';

const ALPHA = 0.35;
const ACCENT_ALPHA = 0.5;

const PATH_PALETTE: [number, number, number][] = [
    [0.0, 0.72, 0.92],
    [0.62, 0.28, 0.92],
    [0.92, 0.72, 0.12],
    [0.12, 0.82, 0.42],
    [0.22, 0.42, 0.95],
    [0.92, 0.22, 0.62],
    [0.12, 0.88, 0.82],
    [0.95, 0.52, 0.12],
];

const SOURCE_COLOR: DebugColor = [0.0, 0.95, 0.55, ACCENT_ALPHA];
const TARGET_COLOR: DebugColor = [0.95, 0.22, 0.25, ACCENT_ALPHA];
const JUNCTION_COLOR: DebugColor = [0.95, 0.85, 0.2, ACCENT_ALPHA];
const SPLITTER_COLOR: DebugColor = [0.85, 0.15, 0.85, ACCENT_ALPHA];

class BatchUpdatePathTask implements ITask<void> {
    public isCanceled = false;
    public stepBatchSize = 500;
    private nodes: GraphNode[];
    private index = 0;

    public constructor(
        nodes: GraphNode[],
        private mode: PathDebuggerMode,
    ) {
        this.nodes = nodes;
    }

    public step(batchSize: number): boolean {
        if (this.isCanceled) return true;
        const limit = Math.min(this.index + batchSize, this.nodes.length);
        for (let i = this.index; i < limit; i++) {
            this.mode.updateNodeColor(this.nodes[i]);
        }
        this.index = limit;
        return this.index >= this.nodes.length;
    }

    public getResult(): void {}
}

export class PathDebuggerMode extends DebuggerMode<INodeDebugData> {
    private dirtyNodes = new Set<GraphNode>();
    private isScheduled = false;

    public constructor(asyncScheduler: AsyncScheduler) {
        super(asyncScheduler, () => ({}));
    }

    public override performNodeUpdate(_graph: Graph, node: GraphNode): void {
        this.dirtyNodes.add(node);
        this.scheduleBatch();
    }

    private scheduleBatch(): void {
        if (this.isScheduled || this.dirtyNodes.size === 0) return;
        this.isScheduled = true;

        const nodesToProcess = Array.from(this.dirtyNodes);
        this.dirtyNodes.clear();

        this.asyncScheduler.schedule(
            new BatchUpdatePathTask(nodesToProcess, this),
            () => {
                this.isScheduled = false;
                if (this.dirtyNodes.size > 0) {
                    this.scheduleBatch();
                }
            },
            'batch-path-update',
        );
    }

    public override onGraphClear(graph: Graph): void {
        this.dirtyNodes.clear();
        this.isScheduled = false;
        super.onGraphClear(graph);
    }

    public updateNodeColor(node: GraphNode): void {
        const debugChunk = this.getDebugChunk(node.chunkIdx);
        if (!debugChunk) return;

        let color: DebugColor | null = [0, 0, 0, 0];

        if (node.isPath) {
            if (node.isPathSplitter) {
                color = SPLITTER_COLOR;
            } else {
                const pathRef = node.pathRef;
                const pathIdx = pathRef ? pathRef.index : 0;
                const pathColor = PATH_PALETTE[pathIdx % PATH_PALETTE.length];

                color = [pathColor[0], pathColor[1], pathColor[2], ALPHA];
            }
        } else {
            let isSource = false;
            let isTarget = false;

            const links = node.links;
            for (let i = 0; i < links.length; i++) {
                const next = links[i];
                if (next.pathRef && next.pathRef.sourceNode === node) {
                    isSource = true;
                    break;
                }
            }

            const backLinks = node.backLinks;
            for (let i = 0; i < backLinks.length; i++) {
                const prev = backLinks[i];
                if (prev.pathRef) {
                    const targets = prev.pathRef.targets;
                    for (let j = 0; j < targets.length; j++) {
                        if (targets[j].node === node) {
                            isTarget = true;
                            break;
                        }
                    }
                    if (isTarget) break;
                }
            }

            if (isSource && isTarget) {
                color = JUNCTION_COLOR;
            } else if (isSource) {
                color = SOURCE_COLOR;
            } else if (isTarget) {
                color = TARGET_COLOR;
            }
        }

        debugChunk.setColor(node.localX, node.localY, color);
    }
}
