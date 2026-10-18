import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchSelectedMap } from './patches/PatchSelectedMap';

const Patches = [PatchSelectedMap];

export const PasteFormatsPlugin = new Plugin(
    'graphdlc-paste-formats',
    {
        name: 'GraphDLC Paste Formats',
        description:
            'Support for Steam (v4, v5) and JSON save formats when pasting',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin],
        defaultEnabled: true,
    },
    {
        patches: Patches,
    },
);
