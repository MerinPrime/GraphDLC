import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchGame } from './patches/PatchGame';
import { UndoRedoHighlightSetting } from './settings/UndoRedoHighlightSetting';

const Patches = [PatchGame];
const Settings = [UndoRedoHighlightSetting];

export const UndoRedoHighlightPlugin = new Plugin(
    'graphdlc-undo-redo-highlight',
    {
        name: 'GraphDLC Undo/Redo Highlight',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin],
        defaultEnabled: true,
    },
    {
        patches: Patches,
        settings: Settings,
    },
);
