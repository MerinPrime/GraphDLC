import type { ChunkUpdates } from '@logic-arrows/game-logic/chunk-updates';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GraphCycle } from 'src/core/graph/ast/cycle/types';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { BaseEngine, type EngineTypes } from '../core/types/BaseEngine';
import type { EngineCapabilities } from '../core/types/EngineCapabilities';
import type { DefaultSnapshot } from './DefaultSnapshot';
import { DefaultState } from './DefaultState';

interface DefaultEngineTypes extends EngineTypes {
    Snapshot: DefaultSnapshot;
    State: DefaultState;
}

export class DefaultEngine extends BaseEngine<DefaultEngineTypes> {
    public override readonly capabilities: EngineCapabilities = {
        canWriteAndClear: false,
        bulkRender: false,
    };

    public chunkUpdates: typeof ChunkUpdates;

    protected readonly state;

    public constructor(
        public readonly graph: Graph,
        public readonly gameMap: GameMap,
    ) {
        super();
        this.chunkUpdates =
            window.graphdlc.patchLoader.getDefinition('ChunkUpdates').val;

        this.state = new DefaultState(graph, gameMap, this.chunkUpdates);
    }

    protected runTickInternal(): boolean {
        if (this.useBreakPoints) {
            this.state.breakPoints.forEach((nodeIdx) => {
                const arrow = this.graph.getArrow(nodeIdx);
                if (arrow.lastSignal === 0 && arrow.signal !== 0) {
                    this.state.isBreakPoint = true;
                    this.state.breakPointNode = nodeIdx;
                }
            });
        }
        this.chunkUpdates.oldUpdate(this.gameMap);
        this.state.tick += 1;
        return this.state.isBreakPoint;
    }

    public addCycle(_cycle: GraphCycle): void {}

    public removeCycle(_cycle: GraphCycle): void {}

    public updateNodeState(_graph: Graph, _node: GraphNode): void {}

    public setNodeBreakpoint(nodeIdx: number, isBreakpoint: boolean): void {
        removeWithSwap(this.state.breakPoints, nodeIdx);
        if (isBreakpoint) {
            this.state.breakPoints.push(nodeIdx);
        }
    }

    public setSnapshotsState(_newState: boolean): void {
        // TIP: disable snapshots
        super.setSnapshotsState(false);
    }
}
