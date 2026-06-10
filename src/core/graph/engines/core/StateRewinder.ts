import type { ISnapshot } from './types';

interface Tier<TSnapshot extends ISnapshot> {
    level: number;
    interval: number;
    snapshots: TSnapshot[];
}

export class StateRewinder<TSnapshot extends ISnapshot> {
    private tiers: Tier<TSnapshot>[] = [];

    public static readonly SNAPSHOTS_PER_TIER: number = 10;
    public static readonly MAX_LEVELS: number = 5;

    public readonly interval: number;

    public constructor(interval: number) {
        this.interval = interval;

        this.initTiers();
    }

    private initTiers() {
        this.tiers = [];
        for (let l = 0; l < StateRewinder.MAX_LEVELS; l++) {
            this.tiers.push({
                level: l,
                interval: this.interval * 2 ** l,
                snapshots: [],
            });
        }
    }

    public saveSnapshot(snapshot: TSnapshot) {
        const tick = snapshot.tick;

        if (tick % this.interval !== 0) {
            return;
        }

        this.addSnapshotToTier(0, snapshot);
    }

    private addSnapshotToTier(level: number, snapshot: TSnapshot) {
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

    public findClosestSnapshot(targetTick: number): TSnapshot | null {
        let bestMatch: TSnapshot | null = null;

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
