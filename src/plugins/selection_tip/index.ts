import { Plugin, PluginPriority } from '../core/Plugin';
import { PatchPlayerArrowActions } from './patches/PatchPlayerArrowActions';
import { PatchPlayerControls } from './patches/PatchPlayerControls';

const Patches = [PatchPlayerArrowActions, PatchPlayerControls];

export const SelectionTipPlugin = new Plugin(
    'graphdlc-selection-tip',
    {
        name: 'GraphDLC Selection Tip',
        priority: PluginPriority.MEDIUM,
        dependencies: [],
        defaultEnabled: true,
    },
    {
        patches: Patches,
    },
);
