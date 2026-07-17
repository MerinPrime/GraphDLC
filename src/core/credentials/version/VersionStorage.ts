type VersionCache = {
    latestVersion: string;
    checkedAt: number;
};

const VERSION_KEY = 'graphdlc:latest-version';

export class VersionStorage {
    static save(data: VersionCache) {
        localStorage.setItem(VERSION_KEY, JSON.stringify(data));
    }

    static get(): VersionCache | undefined {
        const value = localStorage.getItem(VERSION_KEY);

        if (!value) return undefined;

        return JSON.parse(value);
    }

    static clear() {
        localStorage.removeItem(VERSION_KEY);
    }
}
