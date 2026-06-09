import { DebugModeSetting } from './instances/other/DebugModeSetting';
import { EnableArrowRelationsSetting } from './instances/other/EnableArrowRelationsSetting';
import { EnableBreakpointSetting } from './instances/other/EnableBreakpointSetting';
import { MapProtectionSetting } from './instances/other/MapProtectionSetting';
import { ShowArrowConnectionsSetting } from './instances/other/ShowArrowConnectionsSetting';
import { TargetFPSSetting } from './instances/other/TargetFPSSetting';
import { DarkThemeSetting } from './instances/redesign/DarkThemeSetting';
import { GraphDLCDesignSetting } from './instances/redesign/GraphDLCDesignSetting';
import { QoLReDesignSetting } from './instances/redesign/QoLReDesignSetting';
import type { BaseSetting } from './types/BaseSetting';

const settings: BaseSetting<any>[] = [
    TargetFPSSetting,
    EnableBreakpointSetting,
    EnableArrowRelationsSetting,
    ShowArrowConnectionsSetting,
    MapProtectionSetting,
    DebugModeSetting,

    QoLReDesignSetting,
    GraphDLCDesignSetting,
    DarkThemeSetting,
];

export const SettingsRegistry = settings.reduce<
    Record<string, BaseSetting<any>>
>((registry, setting) => {
    const registryKey =
        setting.key.charAt(0).toLowerCase() + setting.key.slice(1);

    registry[registryKey] = setting;
    return registry;
}, {});
