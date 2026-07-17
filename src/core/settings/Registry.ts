import { CycleBudgetSetting } from './instances/performance/CycleBudgetSetting';
import { EnableSnapshotsSetting } from './instances/performance/EnableSnapshotsSetting';
import { GraphEngineSetting } from './instances/performance/GraphEngineSetting';
import { TargetFPSSetting } from './instances/performance/TargetFPSSetting';
import { TPSOverloadSetting } from './instances/performance/TPSOverloadSetting';
import { DarkThemeSetting } from './instances/redesign/DarkThemeSetting';
import { GraphDLCDesignSetting } from './instances/redesign/GraphDLCDesignSetting';
import { QoLReDesignSetting } from './instances/redesign/QoLReDesignSetting';
import { DebugModeSetting } from './instances/tools/DebugModeSetting';
import { EnableArrowRelationsSetting } from './instances/tools/EnableArrowRelationsSetting';
import { EnableBreakpointSetting } from './instances/tools/EnableBreakpointSetting';
import { MapProtectionSetting } from './instances/tools/MapProtectionSetting';
import { ShowArrowConnectionsSetting } from './instances/tools/ShowArrowConnectionsSetting';
import type { BaseSetting } from './types/BaseSetting';

const settings: BaseSetting<any>[] = [
    // Performance
    GraphEngineSetting,
    TargetFPSSetting,
    EnableSnapshotsSetting,
    CycleBudgetSetting,

    // Tools
    EnableArrowRelationsSetting,
    ShowArrowConnectionsSetting,
    MapProtectionSetting,
    DebugModeSetting,
    EnableBreakpointSetting,

    // Visuals
    QoLReDesignSetting,
    GraphDLCDesignSetting,
    DarkThemeSetting,
];

if (__DEBUG__) {
    settings.push(TPSOverloadSetting);
}

export const SettingsRegistry = settings.reduce<
    Record<string, BaseSetting<any>>
>((registry, setting) => {
    const registryKey =
        setting.key.charAt(0).toLowerCase() + setting.key.slice(1);

    registry[registryKey] = setting;
    return registry;
}, {});
