import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchGame } from './patches/PatchGame';
import { EnableArrowRelationsSetting } from './settings/EnableArrowRelationsSetting';
import { ShowArrowConnectionsSetting } from './settings/ShowArrowConnectionsSetting';

const Patches = [PatchGame];

const Settings = [EnableArrowRelationsSetting, ShowArrowConnectionsSetting];

export const ConnectionsPlugin = new Plugin(
    'graphdlc-connections',
    {
        name: 'GraphDLC Connections',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin],
        disabled: false,
        defaultEnabled: true,
    },
    {
        patches: Patches,
        settings: Settings,
    },
);
