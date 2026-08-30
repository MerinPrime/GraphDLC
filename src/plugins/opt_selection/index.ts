import { Plugin, PluginPriority } from '../core/Plugin';
import { PatchSelectedMap } from './patches/PatchSelectedMap';

const Patches = [PatchSelectedMap];

export const OptimizeSelectionPlugin = new Plugin(
    'graphdlc-optimize-selection',
    {
        name: 'GraphDLC Optimize Selection',
        priority: PluginPriority.MEDIUM,
        dependencies: [],
        defaultEnabled: true,
    },
    {
        patches: Patches,
    },
);
