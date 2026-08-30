import { STORAGE_KEYS } from '../StorageKeys';
import type { BaseSetting } from './types/BaseSetting';

export type SettingsRegistry = Record<string, BaseSetting<any>>;

export type ConfigurationData<R extends SettingsRegistry> = {
    [K in keyof R]: R[K]['value'];
};

export class Configuration<R extends SettingsRegistry> {
    public readonly registry: R;
    private unmanagedData: Record<string, any> = {};

    public constructor(registry: R) {
        this.registry = { ...registry };
    }

    public setup() {
        this.load();

        for (const key in this.registry) {
            this.registry[key].onChange.add(() => this.save());
        }
    }

    public registerSettings(extraSettings: Record<string, BaseSetting<any>>) {
        for (const key in extraSettings) {
            const setting = extraSettings[key];
            (this.registry as Record<string, BaseSetting<any>>)[key] = setting;
        }
    }

    public get data(): ConfigurationData<R> {
        const proxyData = {} as ConfigurationData<R>;
        for (const key in this.registry) {
            proxyData[key] = this.registry[key].value;
        }
        return proxyData;
    }

    public load(): void {
        try {
            const rawData = localStorage.getItem(STORAGE_KEYS.Settings);
            if (!rawData) {
                return;
            }

            this.unmanagedData = JSON.parse(rawData) as Record<string, any>;

            for (const key in this.registry) {
                if (key in this.unmanagedData) {
                    this.registry[key].value = this.unmanagedData[key];
                }
            }
        } catch (error) {
            console.error(
                `[Configuration] Failed to load settings from ${STORAGE_KEYS.Settings}:`,
                error,
            );
        }
    }

    public save(): void {
        try {
            const dataToSave: Record<string, any> = { ...this.unmanagedData };
            for (const key in this.registry) {
                const val = this.registry[key].value;
                dataToSave[key] = val;
                this.unmanagedData[key] = val;
            }

            localStorage.setItem(
                STORAGE_KEYS.Settings,
                JSON.stringify(dataToSave),
            );
        } catch (error) {
            console.error(
                `[Configuration] Failed to save settings to ${STORAGE_KEYS.Settings}:`,
                error,
            );
        }
    }

    public resetToDefaults(): void {
        for (const key in this.registry) {
            const setting = this.registry[key];
            setting.value = setting.defaultValue;
        }
        this.save();
    }
}
