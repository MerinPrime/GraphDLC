import { Plugin, PluginPriority } from '../core/Plugin';
import { PatchArrow } from './patches/PatchArrow';
import { PatchChunk } from './patches/PatchChunk';
import { PatchChunkUpdates } from './patches/PatchChunkUpdates';
import { PatchGame } from './patches/PatchGame';
import { PatchGameMap } from './patches/PatchGameMap';
import { PatchGameRender } from './patches/PatchGameRender';
import { PatchLangSettings } from './patches/PatchLangSettings';
import { PatchLoad } from './patches/PatchLoad';
import { PatchLoadShader } from './patches/PatchLoadShader';
import { PatchPlayerControls } from './patches/PatchPlayerControls';
import { PatchPlayerUI } from './patches/PatchPlayerUI';
import { PatchSave } from './patches/PatchSave';
import { EnableSnapshotsSetting } from './settings/performance/EnableSnapshotsSetting';
import { GraphEngineSetting } from './settings/performance/GraphEngineSetting';
import { DebugModeSetting } from './settings/tools/DebugModeSetting';
import { EnableBreakpointSetting } from './settings/tools/EnableBreakpointSetting';

const Patches = [
    PatchArrow,
    PatchChunk,
    PatchChunkUpdates,
    PatchGame,
    PatchGameMap,
    PatchGameRender,
    PatchLangSettings,
    PatchLoad,
    PatchLoadShader,
    PatchPlayerControls,
    PatchPlayerUI,
    PatchSave,
];
const Settings = [
    GraphEngineSetting,
    EnableSnapshotsSetting,

    DebugModeSetting,
    EnableBreakpointSetting,
];

export const CorePlugin = new Plugin(
    'graphdlc-core',
    {
        name: 'GraphDLC Core',
        priority: PluginPriority.MEDIUM,
        dependencies: [],
        disabled: true,
        defaultEnabled: true,
    },
    {
        patches: Patches,
        settings: Settings,
    },
);
