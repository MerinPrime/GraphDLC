import { STORAGE_KEYS } from 'src/core/StorageKeys';

type VersionCache = {
    latestVersion: string;
    checkedAt: number;
};

export namespace VersionStorage {
    export function save(data: VersionCache): void {
        localStorage.setItem(STORAGE_KEYS.LatestVersion, JSON.stringify(data));
    }

    export function get(): VersionCache | undefined {
        const value = localStorage.getItem(STORAGE_KEYS.LatestVersion);
        if (!value) return undefined;
        return JSON.parse(value);
    }

    export function clear(): void {
        localStorage.removeItem(STORAGE_KEYS.LatestVersion);
    }
}
