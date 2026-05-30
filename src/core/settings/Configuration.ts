import { BaseSetting } from "./types/BaseSetting";

export type SettingsRegistry = Record<string, BaseSetting<any>>;

export type ConfigurationData<R extends SettingsRegistry> = {
    [K in keyof R]: R[K]["value"];
};

export class Configuration<R extends SettingsRegistry> {
    readonly registry: R;
    private readonly storageKey: string;

    constructor(registry: R, storageKey = "graphdlcv3-settings") {
        this.registry = registry;
        this.storageKey = storageKey;
        this.load();
    }

    get data(): ConfigurationData<R> {
        const proxyData = {} as ConfigurationData<R>;
        for (const key in this.registry) {
            proxyData[key] = this.registry[key].value;
        }
        return proxyData;
    }

    load(): void {
        try {
            const rawData = localStorage.getItem(this.storageKey);
            if (!rawData) {
                return;
            }

            const parsed = JSON.parse(rawData) as Record<string, any>;

            for (const key in this.registry) {
                if (key in parsed) {
                    this.registry[key].value = parsed[key];
                }
            }
        } catch (error) {
            console.error(`[Configuration] Failed to load settings from ${this.storageKey}:`, error);
        }
    }

    save(): void {
        try {
            const dataToSave = {} as Record<string, any>;
            for (const key in this.registry) {
                dataToSave[key] = this.registry[key].value;
            }

            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
        } catch (error) {
            console.error(`[Configuration] Failed to save settings to ${this.storageKey}:`, error);
        }
    }

    resetToDefaults(): void {
        for (const key in this.registry) {
            const setting = this.registry[key];
            setting.value = setting.defaultValue;
        }
        this.save();
    }
}
