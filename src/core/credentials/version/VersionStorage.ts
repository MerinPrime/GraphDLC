type VersionCache = {
    latestVersion: string;
    checkedAt: number;
};

const VERSION_KEY = 'graphdlc:latest-version';

export namespace VersionStorage {
    export function save(data: VersionCache): void {
        localStorage.setItem(VERSION_KEY, JSON.stringify(data));
    }

    export function get(): VersionCache | undefined {
        const value = localStorage.getItem(VERSION_KEY);
        if (!value) return undefined;
        return JSON.parse(value);
    }

    export function clear(): void {
        localStorage.removeItem(VERSION_KEY);
    }
}
