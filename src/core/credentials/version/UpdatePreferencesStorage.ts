import { STORAGE_KEYS } from 'src/core/StorageKeys';

type UpdatePreferences = {
    remindAt?: number;
    ignoredVersion?: string;
};

export namespace UpdatePreferencesStorage {
    export function save(data: UpdatePreferences): void {
        localStorage.setItem(STORAGE_KEYS.UpdatePref, JSON.stringify(data));
    }

    export function get(): UpdatePreferences | undefined {
        const value = localStorage.getItem(STORAGE_KEYS.UpdatePref);

        if (!value) return undefined;

        try {
            return JSON.parse(value);
        } catch {
            clear();
            return undefined;
        }
    }

    export function clear(): void {
        localStorage.removeItem(STORAGE_KEYS.UpdatePref);
    }
}
