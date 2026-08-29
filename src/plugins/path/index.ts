import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchGame } from './patches/PatchGame';
import { PatchPlayerControls } from './patches/PatchPlayerControls';

const Patches = [PatchGame, PatchPlayerControls];

export const PathPlugin = new Plugin(
    'graphdlc-path',
    {
        name: 'GraphDLC Path',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin],
        defaultEnabled: true,
    },
    {
        patches: Patches,
    },
);
