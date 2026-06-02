import { EnableBreakpointSetting } from './instances/EnableBreakpointSetting';
import { QoLReDesignSetting } from './instances/QoLReDesignSetting';
import { TargetFPSSetting } from './instances/TargetFPSSetting';
import type { BaseSetting } from './types/BaseSetting';

const settings: BaseSetting<any>[] = [
    TargetFPSSetting,
    EnableBreakpointSetting,

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
