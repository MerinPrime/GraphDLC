import { UpdatePreferencesStorage } from './UpdatePreferencesStorage';
import { compareVersions, fetchLatestVersion } from './Utils';
import { VersionStorage } from './VersionStorage';

type VersionState = 'latest' | 'outdated';

let state: VersionState | undefined;
let version: string | undefined;
const listeners: ((s: VersionState, ver: string) => void)[] = [];

export const VersionState = {
    subscribe(fn: (s: VersionState, ver: string) => void) {
        if (state && version) fn(state, version);
        else listeners.push(fn);
    },

    set(s: VersionState, ver: string) {
        state = s;
        version = ver;
        listeners.splice(0).forEach((fn) => {
            fn(s, ver);
        });
    },
};

export async function checkVersion() {
    const currentVersion = __CURRENT_VERSION__.replace(/-test$/i, '');

    const cache = VersionStorage.get();
    let latestVersion: string;

    const updatedFromCached =
        cache && compareVersions(currentVersion, cache.latestVersion) >= 0;

    if (updatedFromCached) {
        UpdatePreferencesStorage.clear();
    }

    const needRefresh =
        !cache ||
        updatedFromCached ||
        Date.now() - cache.checkedAt > 7 * 24 * 60 * 60 * 1000;

    if (needRefresh) {
        latestVersion = await fetchLatestVersion();

        VersionStorage.save({
            latestVersion,
            checkedAt: Date.now(),
        });
    } else {
        latestVersion = cache.latestVersion;
    }

    VersionState.set(
        compareVersions(currentVersion, latestVersion) >= 0
            ? 'latest'
            : 'outdated',
        latestVersion,
    );
}
