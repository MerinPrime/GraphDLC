import { I18nText } from '@logic-arrows/lang/i18n-text';
import { type KeyBindHint, Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchGame } from './patches/PatchGame';
import { PatchPlayerControls } from './patches/PatchPlayerControls';
import { EnableArrowRelationsSetting } from './settings/EnableArrowRelationsSetting';
import { ShowArrowConnectionsSetting } from './settings/ShowArrowConnectionsSetting';

const Patches = [PatchGame, PatchPlayerControls];

const Settings = [EnableArrowRelationsSetting, ShowArrowConnectionsSetting];

export const HighlightPathLocale = new I18nText(
    'highlight path',
    'подсветка пути',
    'підсвічування шляху',
    'падсветка шляху',
    'surligner le chemin',
);

const KeyBindHints: KeyBindHint[] = [
    {
        keys: ['Alt'],
        showOn: ['free'],
        description: HighlightPathLocale,
    },
];

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
        keyBindHints: KeyBindHints,
    },
);
