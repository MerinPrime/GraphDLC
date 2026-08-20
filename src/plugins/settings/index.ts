import { Plugin, PluginPriority } from '../core/Plugin';
import { PatchSettingsPage } from './patches/PatchSettingsPage';
import { PatchUIMenu } from './patches/PatchUIMenu';

const Patches = [PatchSettingsPage, PatchUIMenu];

export const SettingsPlugin = new Plugin(
    'graphdlc-settings',
    {
        name: 'GraphDLC Settings',
        priority: PluginPriority.MEDIUM,
        dependencies: [],
    },
    true,
    Patches,
);
