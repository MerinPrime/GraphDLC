import { EnableBreakpointSetting } from './instances/other/EnableBreakpointSetting';
import { TargetFPSSetting } from './instances/other/TargetFPSSetting';
import { GraphDLCDesignSetting } from './instances/redesign/GraphDLCDesignSetting';
import { QoLReDesignSetting } from './instances/redesign/QoLReDesignSetting';
import type { BaseSetting } from './types/BaseSetting';

const settings: BaseSetting<any>[] = [
    TargetFPSSetting,
    EnableBreakpointSetting,

    QoLReDesignSetting,
    GraphDLCDesignSetting,
];

export const SettingsRegistry = settings.reduce<
    Record<string, BaseSetting<any>>
>((registry, setting) => {
    const registryKey =
        setting.key.charAt(0).toLowerCase() + setting.key.slice(1);

    registry[registryKey] = setting;
    return registry;
}, {});
