import type { RawSnapshot } from './updater/RawSnapshot';
import type { RawGraphState } from './updater/RawState';
import type { RawGraphUpdater } from './updater/RawUpdater';

interface Tier {
    level: number;
    interval: number;
    snapshots: RawSnapshot[];
}

export class StateRewinder {
    private tiers: Tier[] = [];

    public static readonly SNAPSHOT_INTERVAL: number = 1000;
    public static readonly SNAPSHOTS_PER_TIER: number = 10;
    public static readonly MAX_LEVELS: number = 5;

    public constructor() {
        this.initTiers();
    }

    private initTiers() {
        this.tiers = [];
        for (let l = 0; l < StateRewinder.MAX_LEVELS; l++) {
            this.tiers.push({
                level: l,
                interval: StateRewinder.SNAPSHOT_INTERVAL * 2 ** l,
                snapshots: [],
            });
        }
    }

    public saveSnapshot(graphState: RawGraphState) {
        const tick = graphState.tick;

        if (tick % StateRewinder.SNAPSHOT_INTERVAL !== 0) {
            return;
        }

        this.addSnapshotToTier(0, graphState.makeSnapshot());
    }

    public rewindSnapshot(
        graphUpdater: RawGraphUpdater,
        graphState: RawGraphState,
        targetTick: number,
    ): boolean {
        const closestSnapshot = this.findClosestSnapshot(targetTick);
        if (!closestSnapshot) {
            return false;
        }

        const stepsToSimulate = targetTick - closestSnapshot.tick;
        if (stepsToSimulate > 1000000) {
            this.reset();
            return false;
        }

        graphState.loadSnapshot(closestSnapshot);
        for (let i = 0; i < stepsToSimulate; i++) {
            graphUpdater.updateState(graphState);
        }

        return true;
    }

    private addSnapshotToTier(level: number, snapshot: RawSnapshot) {
        if (level >= StateRewinder.MAX_LEVELS) {
            return;
        }

        const tier = this.tiers[level];
        tier.snapshots.push(snapshot);

        tier.snapshots.sort((a, b) => b.tick - a.tick);

        if (tier.snapshots.length > StateRewinder.SNAPSHOTS_PER_TIER) {
            const oldest = tier.snapshots.pop();
            if (!oldest) return;

            const nextLevel = level + 1;
            if (nextLevel < StateRewinder.MAX_LEVELS) {
                const nextTierInterval = this.tiers[nextLevel].interval;

                if (oldest.tick % nextTierInterval === 0) {
                    this.addSnapshotToTier(nextLevel, oldest);
                }
            }
        }
    }

    private findClosestSnapshot(targetTick: number): RawSnapshot | null {
        let bestMatch: RawSnapshot | null = null;

        for (let l = 0; l < StateRewinder.MAX_LEVELS; l++) {
            const snapshots = this.tiers[l].snapshots;
            for (let i = 0; i < snapshots.length; i++) {
                const snap = snapshots[i];
                if (snap.tick <= targetTick) {
                    if (!bestMatch || snap.tick > bestMatch.tick) {
                        bestMatch = snap;
                    }
                }
            }
        }

        return bestMatch;
    }

    public reset() {
        this.initTiers();
    }
}
