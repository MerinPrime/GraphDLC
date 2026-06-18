import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { ChunkUpdates } from '@logic-arrows/game-logic/chunk-updates';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import { EnableSnapshotsSetting } from 'src/core/settings/instances/performance/EnableSnapshotsSetting';
import { EnableBreakpointSetting } from 'src/core/settings/instances/tools/EnableBreakpointSetting';
import { ArrowSignal } from 'src/core/utils/ArrowSignal';
import { removeWithSwap } from 'src/core/utils/removeWithSwap';
import type { GraphCycle } from '../../ast/CycleTypes';
import type { Graph } from '../../ast/Graph';
import type { GraphNode } from '../../ast/GraphNode';
import { NodeSignal } from '../core/NodeSignal';
import { StateRewinder } from '../core/StateRewinder';
import type { IEngine } from '../core/types';
import { ChunkSnapshot, DefaultSnapshot } from './DefaultSnapshot';

export class DefaultEngine implements IEngine {
    public chunkUpdates: typeof ChunkUpdates;
    public rewinder: StateRewinder<DefaultSnapshot> = new StateRewinder();

    private extraRewindNodes: number[] = [];
    private saveSnapshots: boolean = false;
    private extraSignalsHistory: Map<number, Map<number, NodeSignal>> =
        new Map();

    private tick: number = 0;

    private useBreakPoints: boolean = false;
    private isBreakpoint: boolean = false;
    private breakPoints: number[] = [];

    public constructor(
        public readonly graph: Graph,
        public readonly gameMap: GameMap,
    ) {
        this.chunkUpdates =
            window.graphdlc.patchLoader.getDefinition('ChunkUpdates').def;
        this.useBreakPoints = EnableBreakpointSetting.value;
        EnableBreakpointSetting.onChange.add((newValue) => {
            this.useBreakPoints = newValue;
        });
        this.saveSnapshots = EnableSnapshotsSetting.value;
        EnableSnapshotsSetting.onChange.add((newValue) => {
            this.saveSnapshots = newValue;
        });
    }

    public makeSnapshot(): DefaultSnapshot {
        const snapshot = new DefaultSnapshot();
        snapshot.tick = this.getTick();
        this.gameMap.chunks.forEach((chunk) => {
            const chunkSnapshot = new ChunkSnapshot();
            chunkSnapshot.x = chunk.x;
            chunkSnapshot.y = chunk.y;
            chunkSnapshot.signals = chunk
                .getArrows()
                .map((arrow) => arrow.signal);
            snapshot.chunks.push(chunkSnapshot);
        });
        return snapshot;
    }

    public loadSnapshot(snapshot: DefaultSnapshot): void {
        this.tick = snapshot.tick;
        snapshot.chunks.forEach((chunkSnapshot) => {
            const chunk = this.gameMap.getChunk(
                chunkSnapshot.x,
                chunkSnapshot.y,
            );
            chunk?.getArrows().forEach((arrow, idx) => {
                arrow.signal = chunkSnapshot.signals[idx];
            });
        });
    }

    public runTick(): void {
        if (this.saveSnapshots) {
            const signals = new Map<number, NodeSignal>();
            for (const nodeIdx of this.extraRewindNodes) {
                signals.set(nodeIdx, this.getNodeSignal(nodeIdx));
            }
            this.extraSignalsHistory.set(this.getTick(), signals);

            if (this.rewinder.canDoSnapshot()) {
                this.rewinder.saveSnapshot(this.makeSnapshot());

                const oldestTick = this.rewinder.getOldestSnapshotTick();
                for (const tick of this.extraSignalsHistory.keys()) {
                    if (tick < oldestTick) {
                        this.extraSignalsHistory.delete(tick);
                    }
                }
            }
        }
        this.runTickInternal();
    }

    private runTickInternal() {
        if (this.useBreakPoints) {
            this.breakPoints.forEach((nodeIdx) => {
                const arrow = this.graph.getArrow(nodeIdx);
                if (arrow.lastSignal === 0 && arrow.signal !== 0) {
                    this.isBreakpoint = true;
                }
            });
        }
        this.breakPoints;
        //@ts-expect-error
        this.chunkUpdates.oldUpdate(this.gameMap);
        this.tick += 1;
    }

    public runManyTicks(ticksCount: number): void {
        for (let i = 0; i < ticksCount; i++) {
            this.runTick();
        }
    }

    public rewindToTick(targetTick: number): void {
        const closestSnapshot = this.rewinder.findClosestSnapshot(targetTick);
        if (!closestSnapshot) {
            return;
        }

        const stepsToSimulate = targetTick - closestSnapshot.tick;
        if (stepsToSimulate > 1000000) {
            this.rewinder.reset();
            return;
        }

        this.loadSnapshot(closestSnapshot);
        for (let i = 0; i < stepsToSimulate; i++) {
            const currentTick = this.getTick();
            const recordedSignals = this.extraSignalsHistory.get(currentTick);
            if (recordedSignals) {
                for (const [nodeIdx, signal] of recordedSignals) {
                    const arrow = this.graph.getArrow(nodeIdx);
                    arrow.signal = signal;
                }
            }
            this.runTickInternal();
        }
        this.gameMap.chunks.forEach((chunk) => {
            chunk.markRenderDirty();
            chunk.setUpdated();
        });
    }

    public getTick(): number {
        return this.tick;
    }

    public resetBreakpoint(): boolean {
        if (this.isBreakpoint) {
            this.isBreakpoint = false;
            return true;
        }
        return false;
    }

    public isChanged(): boolean {
        return true;
    }

    public getDirtyChunks(_markUndirty: boolean): [...chunkIdx: number[]] {
        return [];
    }

    public makeDirtyChunk(chunkIdx: number): void {
        this.graph.getChunkByIdx(chunkIdx).markRenderDirty();
    }

    public makeUndirtyChunk(chunkIdx: number): void {
        this.graph.getChunkByIdx(chunkIdx).renderDirty = false;
    }

    public getNodeSignal(nodeIdx: number): NodeSignal {
        const arrow = this.graph.getArrow(nodeIdx);
        if (arrow.signal === ArrowSignal.BLUE) return NodeSignal.PENDING;
        if (arrow.signal === ArrowSignal.NONE) return NodeSignal.NONE;
        return NodeSignal.ACTIVE;
    }

    public setExtraRewindNodes(_nodeIndices: Set<number>): void {
        this.extraRewindNodes = Array.from(_nodeIndices);
    }

    public reset(): void {
        //@ts-expect-error
        this.chunkUpdates.oldClearSignals(this.gameMap);
        this.tick = 0;
    }

    public onCycleBuild(_cycle: GraphCycle): void {}

    public onCycleDismantle(_cycle: GraphCycle): void {}

    public updateNodeChange(_node: GraphNode, _oldLinks: GraphNode[]): void {
        removeWithSwap(this.breakPoints, _node.nodeIdx);
        if (_node.isBreakpoint) {
            this.breakPoints.push(_node.nodeIdx);
        }
    }

    public updateNodeState(_node: GraphNode, _resetSignal?: boolean): void {
        removeWithSwap(this.breakPoints, _node.nodeIdx);
        if (_node.isBreakpoint) {
            this.breakPoints.push(_node.nodeIdx);
        }
    }

    public updateChunk(_chunk: Chunk): void {}

    public doPressButton(_nodeIdx: number, _state: boolean): void {}

    public clear(): void {
        this.tick = 0;
    }
}
