import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { BaseSetting } from 'src/core/settings/types/BaseSetting';
import { ReactiveValue } from 'src/core/utils/ReactiveValue';
import { ApplyPatches, type IPatcher } from '../Patcher';

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
}

export class Plugin {
    public readonly id: string;
    public readonly meta: PluginMeta;
    public readonly defaultEnabled: boolean;
    public readonly patches: IPatcher[];
    public readonly settings: BaseSetting<any>[];

    public readonly enabled: ReactiveValue<boolean>;

    public constructor(
        id: string,
        meta: PluginMeta,
        defaultEnabled: boolean = false,
        patches: IPatcher[] = [],
        settings: BaseSetting<any>[] = [],
    ) {
        this.id = id;
        this.meta = meta;
        this.defaultEnabled = defaultEnabled;
        this.patches = patches;
        this.settings = settings;

        this.enabled = new ReactiveValue<boolean>(defaultEnabled);
    }

    public get isEnabled(): boolean {
        return this.enabled.value;
    }

    public set isEnabled(value: boolean) {
        this.enabled.value = value;
    }

    public inject(graphDLC: GraphDLC, patchLoader: PatchLoader): void {
        ApplyPatches(patchLoader, graphDLC, this.patches);
    }
}
