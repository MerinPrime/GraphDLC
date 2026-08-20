import { DeveloperModeSetting } from './instances/developer/DeveloperModeSetting';
import { QoLReDesignSetting } from './instances/redesign/QoLReDesignSetting';
import type { BaseSetting } from './types/BaseSetting';

const settings: BaseSetting<any>[] = [
    // Developer
    DeveloperModeSetting,

    // Visuals
    QoLReDesignSetting,
];

export const SettingsRegistry = settings.reduce<
    Record<string, BaseSetting<any>>
>((registry, setting) => {
    const registryKey =
        setting.key.charAt(0).toLowerCase() + setting.key.slice(1);

    registry[registryKey] = setting;
    return registry;
}, {});
