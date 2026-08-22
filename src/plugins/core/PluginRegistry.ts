import { ConnectionsPlugin } from '../connections';
import { DarkThemePlugin } from '../dark_theme';
import { DeveloperPlugin } from '../developer';
import { CorePlugin } from '../graphdlc';
import { MapProtectionPlugin } from '../map_protection';
import { MoveSelectionPlugin } from '../move_selection';
import { NewSavePlugin } from '../new_save';
import { OptimizeSelectionPlugin } from '../opt_selection';
import { PathPlugin } from '../path';
import { PluginsPlugin } from '../plugins';
import { PowerPlugin } from '../power';
import { SelectionTipPlugin } from '../selection_tip';
import { SettingsPlugin } from '../settings';
import { TPSPlugin } from '../tps';
import { VisualSelectionPlugin } from '../visual_selection';
import type { Plugin } from './Plugin';

export const PluginRegistry: Plugin[] = [
    CorePlugin,
    PluginsPlugin,
    ConnectionsPlugin,
    PathPlugin,
    PowerPlugin,
    DarkThemePlugin,
    DeveloperPlugin,
    TPSPlugin,
    MapProtectionPlugin,
    SelectionTipPlugin,
    SettingsPlugin,
    NewSavePlugin,

    OptimizeSelectionPlugin,
    MoveSelectionPlugin,
    VisualSelectionPlugin,
];
