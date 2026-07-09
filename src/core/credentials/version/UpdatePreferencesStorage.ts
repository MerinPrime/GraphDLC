type UpdatePreferences = {
    remindAt?: number;
    ignoredVersion?: string;
};

const UPDATE_PREFERENCES_KEY = 'graphdlc:update-preferences';

export class UpdatePreferencesStorage {
    static save(data: UpdatePreferences) {
        localStorage.setItem(UPDATE_PREFERENCES_KEY, JSON.stringify(data));
    }

    static get(): UpdatePreferences | undefined {
        const value = localStorage.getItem(UPDATE_PREFERENCES_KEY);

        if (!value) return undefined;

        try {
            return JSON.parse(value);
        } catch {
            UpdatePreferencesStorage.clear();
            return undefined;
        }
    }

    static clear() {
        localStorage.removeItem(UPDATE_PREFERENCES_KEY);
    }
}
