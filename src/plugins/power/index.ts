import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchPlayerControls } from './patches/PatchPlayerControls';

const Patches = [PatchPlayerControls];

export const PowerPlugin = new Plugin(
    'graphdlc-power',
    {
        name: 'GraphDLC Power',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin],
        defaultEnabled: true,
    },
    {
        patches: Patches,
    },
);
