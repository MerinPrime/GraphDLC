import { I18nText } from '@logic-arrows/lang/i18n-text';
import { LmbLocale } from '../core/KeybindsLocales';
import { type KeyBindHint, Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchGame } from './patches/PatchGame';
import { PatchPlayerControls } from './patches/PatchPlayerControls';
import { EnableArrowRelationsSetting } from './settings/EnableArrowRelationsSetting';
import { GraphVisualizerSetting } from './settings/GraphVisualizerSetting';
import { ShowArrowConnectionsSetting } from './settings/ShowArrowConnectionsSetting';

const Patches = [PatchGame, PatchPlayerControls];

const Settings = [
    EnableArrowRelationsSetting,
    ShowArrowConnectionsSetting,
    GraphVisualizerSetting,
];

export const HighlightPathLocale = new I18nText(
    'highlight path',
    'подсветка пути',
    'підсвічування шляху',
    'падсветка шляху',
    'surligner le chemin',
);

export const PinPathLocale = new I18nText(
    'pin path',
    'зафиксировать путь',
    'зафіксувати шлях',
    'зафіксаваць шлях',
    'épingler le chemin',
);

const KeyBindHints: KeyBindHint[] = [
    {
        keys: ['Alt'],
        showOn: ['free'],
        description: HighlightPathLocale,
    },
    {
        keys: ['Alt', LmbLocale],
        showOn: ['free'],
        description: PinPathLocale,
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
