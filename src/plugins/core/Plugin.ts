import type { BaseSetting } from 'src/core/settings/types/BaseSetting';
import type { BoolSetting } from 'src/core/settings/types/BoolSetting';
import { ReactiveValue } from 'src/core/utils/ReactiveValue';
import type { IPatcher } from '../Patcher';

export const enum PluginPriority {
    LOW,
    MEDIUM,
    HIGH,
}

export interface PluginMeta {
    readonly name: string;
    readonly priority: PluginPriority;
    readonly description?: string;
    readonly dependencies?: Plugin[];
    readonly version?: string;
    readonly disabled?: boolean;
    readonly defaultEnabled?: boolean;
}

export interface PluginFeatures {
    readonly patches?: IPatcher[];
    readonly settings?: BaseSetting<any>[];
    readonly enableSetting?: BoolSetting | null;
}

export class Plugin {
    public readonly id: string;
    public readonly meta: PluginMeta;
    public readonly features: PluginFeatures;

    public readonly enabled: ReactiveValue<boolean>;

    public constructor(id: string, meta: PluginMeta, features: PluginFeatures) {
        this.id = id;
        this.meta = meta;
        this.features = features;

        this.enabled = new ReactiveValue<boolean>(
            this.meta.defaultEnabled ?? false,
        );
    }

    public get isEnabled(): boolean {
        return this.enabled.value;
    }

    public set isEnabled(value: boolean) {
        this.enabled.value = value;
    }
}
