import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchBackend } from './patches/PatchBackend';
import { PatchGameMap } from './patches/PatchGameMap';
import { PatchGamePage } from './patches/PatchGamePage';
import { PatchPlayerControls } from './patches/PatchPlayerControls';
import { PatchUIMenu } from './patches/PatchUIMenu';
import { UnsavedWarnSetting } from './settings/UnsavedWarnSetting';

const Patches = [
    PatchBackend,
    PatchGameMap,
    PatchGamePage,
    PatchPlayerControls,
    PatchUIMenu,
];
const Settings = [UnsavedWarnSetting];

export const NewSavePlugin = new Plugin(
    'graphdlc-new-save',
    {
        name: 'GraphDLC New Save',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin],
    },
    true,
    Patches,
    Settings,
);
