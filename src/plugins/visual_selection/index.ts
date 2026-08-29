import { Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchGame } from './patches/PatchGame';
import { PatchGameRender } from './patches/PatchGameRender';
import { PatchLoadShader } from './patches/PatchLoadShader';
import { PatchSelectedMap } from './patches/PatchSelectedMap';
import { VisualSelectionSetting } from './settings/VisualSelectionSetting';

const Patches = [PatchGameRender, PatchLoadShader, PatchGame, PatchSelectedMap];

export const VisualSelectionPlugin = new Plugin(
    'graphdlc-visual-selection',
    {
        name: 'GraphDLC Visual Selection',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin], // TODO: make core plugin instead core & graph
    },
    true,
    Patches,
    [],
    VisualSelectionSetting,
);
