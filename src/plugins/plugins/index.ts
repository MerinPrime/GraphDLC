import { Plugin, PluginPriority } from '../core/Plugin';
import { PatchMenuPage } from './patches/PatchMenuPage';
import { PatchNavigation } from './patches/PatchNavigation';

const Patches = [PatchNavigation, PatchMenuPage];

export const PluginsPlugin = new Plugin(
    'graphdlc-plugins-page',
    {
        name: 'GraphDLC Plugins Page',
        priority: PluginPriority.MEDIUM,
        dependencies: [],
        disabled: true,
    },
    false,
    Patches,
);
