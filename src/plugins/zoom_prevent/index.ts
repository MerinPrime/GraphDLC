import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchZoomPrevent } from './patches/PatchZoomPrevent';
import { WarnIncorrectZoomSetting } from './settings/WarnIncorrectZoomSetting';

const Patches = [PatchZoomPrevent];
const Settings = [WarnIncorrectZoomSetting];

export const ZoomPreventPlugin = new Plugin(
    'graphdlc-zoom-prevent',
    {
        name: 'GraphDLC Zoom Prevent',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin],
        defaultEnabled: true,
    },
    {
        patches: Patches,
        settings: Settings,
    },
);
