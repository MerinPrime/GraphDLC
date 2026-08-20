import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchGame } from './patches/PatchGame';
import { PatchPlayerControls } from './patches/PatchPlayerControls';
import { PatchPlayerUI } from './patches/PatchPlayerUI';
import { PatchSpeedController } from './patches/PatchSpeedController';
import { TargetFPSSetting } from './settings/TargetFPSSetting';
import { TPSOverloadSetting } from './settings/TPSOverloadSetting';

const Patches = [
    PatchGame,
    PatchPlayerControls,
    PatchPlayerUI,
    PatchSpeedController,
];
const Settings = [TargetFPSSetting, TPSOverloadSetting];

export const TPSPlugin = new Plugin(
    'graphdlc-tps',
    {
        name: 'GraphDLC TPS',
        priority: PluginPriority.LOW,
        dependencies: [CorePlugin],
    },
    true,
    Patches,
    Settings,
);
