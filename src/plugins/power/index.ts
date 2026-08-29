import { I18nText } from '@logic-arrows/lang/i18n-text';
import { type KeyBindHint, Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchPlayerControls } from './patches/PatchPlayerControls';

const Patches = [PatchPlayerControls];

const SettingSignalLocale = new I18nText(
    'setting signal',
    'установка сигнала',
    'установка сигналу',
    'устаноўка сігналу',
    'définition du signal',
);

const ClearingSignalLocale = new I18nText(
    'clearing signal',
    'очистка сигнала',
    'очищення сигналу',
    'ачыстка сігналу',
    'nettoyage du signal',
);

const KeyBindHints: KeyBindHint[] = [
    {
        keys: ['P'],
        showOn: ['free'],
        description: SettingSignalLocale,
    },
    {
        keys: ['Shift', 'P'],
        showOn: ['free'],
        description: ClearingSignalLocale,
    },
];

export const PowerPlugin = new Plugin(
    'graphdlc-power',
    {
        name: 'GraphDLC Power',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin],
        defaultEnabled: true,
    },
    {
        patches: Patches,
        keyBindHints: KeyBindHints,
    },
);
