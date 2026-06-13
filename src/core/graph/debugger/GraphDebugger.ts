import type { Chunk } from '@logic-arrows/game-logic/chunk';
import {
    DebugMode,
    DebugModeSetting,
} from 'src/core/settings/instances/tools/DebugModeSetting';
import { AsyncScheduler } from 'src/core/task/AsyncScheduler';
import type { Bounds } from 'src/core/utils/Bounds';
import type { GraphCycle } from '../ast/CycleTypes';
import type { Graph } from '../ast/Graph';
import type { GraphNode } from '../ast/GraphNode';
import type { IGraphListener } from '../ast/IGraphListener';
import type { DebuggerMode } from './DebuggerMode';
import { CycleDebuggerMode } from './modes/Cycle';
import { DeadNodeDebuggerMode } from './modes/DeadNodes';
import { SignalPropagationDebuggerMode } from './modes/SignalPropagation';
import type { RenderDebugColor } from './types';

export class GraphDebugger implements IGraphListener {
    private readonly modes: Record<
        Exclude<DebugMode, DebugMode.OFF>,
        DebuggerMode<any>
    >;

    private activeMode: DebuggerMode<any> | null = null;

    private readonly graph: Graph;
    private readonly asyncScheduler: AsyncScheduler;

    public constructor(graph: Graph) {
        this.graph = graph;
        this.asyncScheduler = new AsyncScheduler(() => 1);

        this.modes = {
            [DebugMode.SHOW_RINGS]: new CycleDebuggerMode(this.asyncScheduler),
            [DebugMode.SHOW_SIGNAL_PROPAGATION]:
                new SignalPropagationDebuggerMode(this.asyncScheduler),
            [DebugMode.SHOW_UNUSED_ARROWS]: new DeadNodeDebuggerMode(
                this.asyncScheduler,
            ),
        };

        DebugModeSetting.onChange.add((newDebugMode: DebugMode) => {
            this.onDebugModeChange(newDebugMode);
        });
        this.onDebugModeChange(DebugModeSetting.value);
    }

    public onDebugModeChange(newDebugMode: DebugMode) {
        if (this.activeMode) {
            this.activeMode.onGraphClear(this.graph);
        }

        this.activeMode =
            newDebugMode === DebugMode.OFF ? null : this.modes[newDebugMode];

        if (this.activeMode) this.activeMode.syncWithGraph(this.graph);
    }

    public render(bounds: Bounds, renderColor: RenderDebugColor) {
        this.activeMode?.renderChunks(bounds, renderColor);
    }

    public onGraphClear(g: Graph): void {
        this.activeMode?.onGraphClear(g);
    }

    public onChunkAdded(g: Graph, c: Chunk, i: number): void {
        this.activeMode?.onChunkAdded(g, c, i);
    }

    public onNodeAdded(g: Graph, n: GraphNode): void {
        this.activeMode?.onNodeAdded(g, n);
    }

    public onLinkAdded(g: Graph, f: GraphNode, t: GraphNode): void {
        this.activeMode?.onLinkAdded(g, f, t);
    }

    public onLinkRemoved(g: Graph, f: GraphNode, t: GraphNode): void {
        this.activeMode?.onLinkRemoved(g, f, t);
    }

    public onNodeTypeChanged(g: Graph, n: GraphNode): void {
        this.activeMode?.onNodeTypeChanged(g, n);
    }

    public onCycleAdded(g: Graph, c: GraphCycle): void {
        this.activeMode?.onCycleAdded(g, c);
    }

    public onCycleRemoved(g: Graph, c: GraphCycle): void {
        this.activeMode?.onCycleRemoved(g, c);
    }
}
