import { I18nText } from '@logic-arrows/lang/i18n-text';
import { RmbLocale } from '../core/KeybindsLocales';
import { type KeyBindHint, Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchGame } from './patches/PatchGame';
import { PatchPlayerControls } from './patches/PatchPlayerControls';

const Patches = [PatchGame, PatchPlayerControls];

const PathfindingLocale = new I18nText(
    'pathfinding',
    'прокладка пути',
    'прокладання шляху',
    'пракладка шляху',
    "recherche d'itinéraire",
);

const LinearPathLocale = new I18nText(
    'linear path',
    'линейный путь',
    'лінійний шлях',
    'лінейны шлях',
    'trajet linéaire',
);

const KeyBindHints: KeyBindHint[] = [
    {
        keys: [RmbLocale],
        showOn: ['free'],
        description: PathfindingLocale,
    },
    {
        keys: [RmbLocale],
        showOn: ['arrow'],
        description: LinearPathLocale,
    },
];

export const PathPlugin = new Plugin(
    'graphdlc-path',
    {
        name: 'GraphDLC Path',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin],
        defaultEnabled: true,
    },
    {
        patches: Patches,
        keyBindHints: KeyBindHints,
    },
);
