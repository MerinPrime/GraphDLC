import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchPlayerUI } from './patches/PatchPlayerUI';

const Patches = [PatchPlayerUI];

export const DeveloperPlugin = new Plugin(
    'graphdlc-developer',
    {
        name: 'GraphDLC Developer',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin],
        defaultEnabled: true,
    },
    {
        patches: Patches,
    },
);
