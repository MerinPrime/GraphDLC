import { Plugin, PluginPriority } from '../core/Plugin';
import { PatchBackend } from './patches/PatchBackend';
import { MapProtectionSetting } from './settings/MapProtectionSetting';

const Patches = [PatchBackend];
const Settings = [MapProtectionSetting];

export const MapProtectionPlugin = new Plugin(
    'graphdlc-map-protection',
    {
        name: 'GraphDLC Map Protection',
        priority: PluginPriority.MEDIUM,
        dependencies: [],
        defaultEnabled: true,
    },
    {
        patches: Patches,
        settings: Settings,
    },
);
