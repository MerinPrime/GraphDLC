import { Plugin, PluginPriority } from '../core/Plugin';
import { PatchGame } from './patches/PatchGame';
import { PatchGameRender } from './patches/PatchGameRender';
import { PatchLoadShader } from './patches/PatchLoadShader';
import { DarkThemeSetting } from './settings/DarkThemeSetting';

const Patches = [PatchGame, PatchGameRender, PatchLoadShader];
const Settings = [DarkThemeSetting];

export const DarkThemePlugin = new Plugin(
    'graphdlc-dark-theme',
    {
        name: 'GraphDLC Dark Theme',
        priority: PluginPriority.MEDIUM,
        dependencies: [],
    },
    true,
    Patches,
    Settings,
);
