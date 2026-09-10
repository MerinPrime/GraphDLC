import type { ChunkUpdates } from '@logic-arrows/game-logic/chunk-updates';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GraphCycle } from 'src/core/graph/ast/cycle/CycleTypes';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { BaseEngine, type EngineTypes } from '../core/types/BaseEngine';
import type { DefaultSnapshot } from './DefaultSnapshot';
import { DefaultState } from './DefaultState';

interface DefaultEngineTypes extends EngineTypes {
    Snapshot: DefaultSnapshot;
    State: DefaultState;
}

export class DefaultEngine extends BaseEngine<DefaultEngineTypes> {
    public chunkUpdates: typeof ChunkUpdates;

    protected readonly state;

    private breakPoints: number[] = [];

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
            this.breakPoints.forEach((nodeIdx) => {
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

    public updateNodeState(_graph: Graph, node: GraphNode): void {
        removeWithSwap(this.breakPoints, node.nodeIdx);
        if (node.isBreakpoint) {
            this.breakPoints.push(node.nodeIdx);
        }
    }
}
