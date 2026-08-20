import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchPlayerControls } from './patches/PatchPlayerControls';

const Patches = [PatchPlayerControls];

export const MoveSelectionPlugin = new Plugin(
    'graphdlc-move-selection',
    {
        name: 'GraphDLC Move Selection',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin], // TODO: make core plugin instead core & graph
    },
    true,
    Patches,
);
