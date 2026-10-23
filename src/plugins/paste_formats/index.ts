import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchHistory } from './patches/PatchHistory';
import { PatchNavigation } from './patches/PatchNavigation';
import { PatchSelectedMap } from './patches/PatchSelectedMap';

const Patches = [PatchSelectedMap, PatchNavigation, PatchHistory];

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
