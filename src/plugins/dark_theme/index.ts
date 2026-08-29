import { Plugin, PluginPriority } from '../core/Plugin';
import { PatchGame } from './patches/PatchGame';
import { PatchGameRender } from './patches/PatchGameRender';
import { PatchLoadShader } from './patches/PatchLoadShader';
import { DarkThemeSetting } from './settings/DarkThemeSetting';
import { HighContrastSetting } from './settings/HighContrastSetting';

const Patches = [PatchGame, PatchGameRender, PatchLoadShader];
const Settings = [DarkThemeSetting, HighContrastSetting];

export const DarkThemePlugin = new Plugin(
    'graphdlc-dark-theme',
    {
        name: 'GraphDLC Dark Theme',
        priority: PluginPriority.MEDIUM,
        dependencies: [],
        defaultEnabled: true,
    },
    {
        patches: Patches,
        settings: Settings,
    },
);
