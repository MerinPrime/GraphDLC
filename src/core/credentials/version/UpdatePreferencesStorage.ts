import { STORAGE_KEYS } from 'src/core/StorageKeys';

type UpdatePreferences = {
    remindAt?: number;
    ignoredVersion?: string;
};

export class UpdatePreferencesStorage {
    static save(data: UpdatePreferences) {
        localStorage.setItem(STORAGE_KEYS.UpdatePref, JSON.stringify(data));
    }

    static get(): UpdatePreferences | undefined {
        const value = localStorage.getItem(STORAGE_KEYS.UpdatePref);

        if (!value) return undefined;

        try {
            return JSON.parse(value);
        } catch {
            UpdatePreferencesStorage.clear();
            return undefined;
        }
    }

    static clear() {
        localStorage.removeItem(STORAGE_KEYS.UpdatePref);
    }
}
