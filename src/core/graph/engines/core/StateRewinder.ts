import type { ISnapshot } from './types';

interface WrappedSnapshot<TSnapshot extends ISnapshot> {
    timestamp: number;
    data: TSnapshot;
}

interface Tier<TSnapshot extends ISnapshot> {
    level: number;
    interval: number;
    snapshots: WrappedSnapshot<TSnapshot>[];
}

export class StateRewinder<TSnapshot extends ISnapshot> {
    private tiers: Tier<TSnapshot>[] = [];

    public static readonly SNAPSHOTS_PER_TIER: number = 10;
    public static readonly MAX_LEVELS: number = 5;

    public readonly baseInterval: number = 250;
    private lastSavedTime: number = 0;

    public constructor() {
        this.initTiers();
    }

    private initTiers() {
        this.tiers = [];
        for (let l = 0; l < StateRewinder.MAX_LEVELS; l++) {
            this.tiers.push({
                level: l,
                interval: this.baseInterval * 2 ** l,
                snapshots: [],
            });
        }
    }

    public canDoSnapshot(): boolean {
        const now = performance.now();

        if (now - this.lastSavedTime < this.baseInterval) {
            return false;
        }

        return true;
    }

    public saveSnapshot(snapshot: TSnapshot) {
        const now = performance.now();

        if (now - this.lastSavedTime < this.baseInterval) {
            return;
        }

        this.lastSavedTime = now;

        const wrapped: WrappedSnapshot<TSnapshot> = {
            timestamp: now,
            data: snapshot,
        };

        this.addSnapshotToTier(0, wrapped);
    }

    private addSnapshotToTier(
        level: number,
        wrappedSnapshot: WrappedSnapshot<TSnapshot>,
    ) {
        if (level >= StateRewinder.MAX_LEVELS) return;

        const tier = this.tiers[level];

        tier.snapshots.unshift(wrappedSnapshot);

        if (tier.snapshots.length > StateRewinder.SNAPSHOTS_PER_TIER) {
            const oldest = tier.snapshots.pop();
            if (!oldest) return;

            const nextLevel = level + 1;
            if (nextLevel < StateRewinder.MAX_LEVELS) {
                const nextTier = this.tiers[nextLevel];
                const lastNextTierSnap = nextTier.snapshots[0];

                if (
                    !lastNextTierSnap ||
                    oldest.timestamp - lastNextTierSnap.timestamp >=
                        nextTier.interval
                ) {
                    this.addSnapshotToTier(nextLevel, oldest);
                }
            }
        }
    }

    public findClosestSnapshot(targetTimestamp: number): TSnapshot | null {
        let bestMatch: WrappedSnapshot<TSnapshot> | null = null;

        for (let l = 0; l < StateRewinder.MAX_LEVELS; l++) {
            const snapshots = this.tiers[l].snapshots;

            for (let i = 0; i < snapshots.length; i++) {
                const snap = snapshots[i];

                if (snap.timestamp <= targetTimestamp) {
                    if (!bestMatch || snap.timestamp > bestMatch.timestamp) {
                        bestMatch = snap;

                        break;
                    }
                }
            }
        }

        return bestMatch ? bestMatch.data : null;
    }

    public reset() {
        this.lastSavedTime = 0;
        this.initTiers();
    }
}
