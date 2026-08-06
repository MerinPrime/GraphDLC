import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { GraphCycle } from '../../ast/CycleTypes';
import type { GraphNode } from '../../ast/GraphNode';
import type { NodeSignal } from '../core/NodeSignal';
import { BaseEngine, type EngineTypes } from '../core/types/BaseEngine';
import type { SoASnapshot } from './SoASnapshot';
import { SoAGraphState } from './SoAState';
import { SoAStateSynchronizer } from './SoAStateSynchronizer';
import { SoAGraphUpdater } from './SoAUpdater';

interface SoAEngineTypes extends EngineTypes {
    Snapshot: SoASnapshot;
}

export class SoAEngine extends BaseEngine<SoAEngineTypes> {
    private readonly state: SoAGraphState = new SoAGraphState();
    private readonly updater: SoAGraphUpdater = new SoAGraphUpdater();
    private readonly synchronizer: SoAStateSynchronizer =
        new SoAStateSynchronizer(this.updater);

    protected runTickInternal(): boolean {
        this.updater.updateState(this.state);
        return this.state.breakPoint;
    }

    protected makeSnapshot(): SoASnapshot {
        return this.state.makeSnapshot();
    }

    protected loadSnapshot(snapshot: SoASnapshot): void {
        this.state.loadSnapshot(snapshot);
    }

    protected markAllChunksDirty(): void {
        this.state.markAllChunksDirty();
    }

    public setNodeSignalInternal(nodeIdx: number, signal: NodeSignal): void {
        this.state.setNodeSignal(nodeIdx, signal);
    }

    public getTick(): number {
        return this.state.tick;
    }

    public getBreakpoint(doReset: boolean = false): number | false {
        if (this.state.breakPoint) {
            this.state.breakPoint = !doReset;
            return this.state.breakPointNode;
        }
        return false;
    }

    public isChanged(): boolean {
        return this.state.changedNodes.length !== 0;
    }

    public getDirtyChunks(markUndirty: boolean): [...chunkIdx: number[]] {
        return this.state.getDirtyChunks(markUndirty);
    }

    public makeDirtyChunk(chunkIdx: number): void {
        this.state.makeDirtyChunk(chunkIdx);
    }

    public makeUndirtyChunk(chunkIdx: number): void {
        this.state.makeUndirtyChunk(chunkIdx);
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        return this.state.getNodeSignal(nodeIdx);
    }

    public reset(): void {
        this.state.reset();
        this.rewinder.reset();
        this.extraSignalsHistory.clear();
    }

    public onCycleBuild(cycle: GraphCycle): void {
        this.synchronizer.onCycleBuild(this.state, cycle);
    }

    public onCycleDismantle(cycle: GraphCycle): void {
        this.synchronizer.onCycleDismantle(this.state, cycle);
    }

    public updateNodeChange(node: GraphNode, oldLinks: GraphNode[]): void {
        this.synchronizer.updateNodeChange(
            this.state,
            node,
            oldLinks,
            node.links,
        );
    }

    public resetNodeSignal(node: GraphNode): void {
        this.state.resetNodeSignal(node);
    }

    public updateNodeState(node: GraphNode): void {
        this.state.updateNodeState(node);
    }

    public updateChunk(chunk: Chunk): void {
        this.state.updateChunk(chunk);
    }

    public clear(): void {
        this.state.clear();
    }
}
