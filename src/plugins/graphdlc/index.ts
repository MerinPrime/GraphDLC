import { I18nText } from '@logic-arrows/lang/i18n-text';
import { type KeyBindHint, Plugin, PluginPriority } from '../core/Plugin';
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
import { PatchUIControlsHint } from './patches/PatchUIControlsHint';
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
    PatchUIControlsHint,
];

const Settings = [
    GraphEngineSetting,
    EnableSnapshotsSetting,

    DebugModeSetting,
    EnableBreakpointSetting,
];

export const TickRewindLocale = new I18nText(
    'tick rewind',
    'откат тика',
    'відкат тику',
    'адкат тыку',
    'retour du tick',
);

const KeyBindHints: KeyBindHint[] = [
    {
        keys: ['Shift', 'Enter'],
        showOn: ['free'],
        description: TickRewindLocale,
    },
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
        keyBindHints: KeyBindHints,
    },
);
