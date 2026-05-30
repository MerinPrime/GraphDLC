import { Configuration } from './Configuration';
import { SettingsRegistry } from './Registry';
import { BaseSetting } from './types/BaseSetting';
import type { SettingGroup } from './types/SettingGroup';

export interface SortedSettingGroup {
    group: SettingGroup;
    settings: BaseSetting<any>[];
}

export class SettingsManager {
    config: Configuration<typeof SettingsRegistry>;

    public constructor() {
        this.config = new Configuration(
            SettingsRegistry,
            'graphdlc-v3-settings',
        );
    }

    public get data(): {
        [K in keyof typeof SettingsRegistry]: (typeof SettingsRegistry)[K] extends BaseSetting<
            infer T
        >
            ? T
            : never;
    } {
        return this.config.data as any;
    }

    public getSortedSettings(): SortedSettingGroup[] {
        const groupsMap = new Map<SettingGroup, BaseSetting<any>[]>();

        const settings: BaseSetting<any>[] = [];
        const keys = Object.getOwnPropertyNames(
            Object.getPrototypeOf(this.config.registry),
        ).concat(Object.getOwnPropertyNames(this.config.registry));

        for (const key of keys) {
            if (['prototype', 'name', 'length', 'constructor'].includes(key))
                continue;
            const property = (this.config.registry as any)[key];
            if (property instanceof BaseSetting) {
                settings.push(property);
            }
        }

        for (const setting of settings) {
            const group = setting.meta.group;
            if (!group) continue;

            if (!groupsMap.has(group)) {
                groupsMap.set(group, []);
            }
            groupsMap.get(group)!.push(setting);
        }

        const sortedGroups: SortedSettingGroup[] = [];
        groupsMap.forEach((settingsInGroup, group) => {
            const sortedSettings = settingsInGroup.sort((a, b) => {
                const orderA = a.meta.order ?? 0;
                const orderB = b.meta.order ?? 0;
                return orderA - orderB;
            });

            sortedGroups.push({
                group,
                settings: sortedSettings,
            });
        });

        return sortedGroups.sort((a, b) => {
            const orderA = a.group.order ?? 0;
            const orderB = b.group.order ?? 0;
            return orderA - orderB;
        });
    }
}
