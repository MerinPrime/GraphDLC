import type { RawCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';

export interface ISnapshot {
    tick: number;
}

export interface IEngine {
    runTick(): void;
    // runMaxTPS(): void;
    rewindToTick(targetTick: number): void;

    getTick(): number;

    reset(): void;

    onCycleBuild(cycle: RawCycle): void;
    onCycleDismantle(cycle: RawCycle): void;

    updateNodeChange(
        node: GraphNode,
        oldNextFull: GraphNode[],
        next: GraphNode[],
    ): void;

    doPressButton(astIdx: number, state: boolean): void;
}
