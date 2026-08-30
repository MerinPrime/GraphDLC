import { I18nText } from '@logic-arrows/lang/i18n-text';
import { LmbLocale } from '../core/KeybindsLocales';
import { type KeyBindHint, Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchPlayerControls } from './patches/PatchPlayerControls';

const Patches = [PatchPlayerControls];

export const MoveLocale = new I18nText(
    'move',
    'передвинуть',
    'пересунути',
    'перамясціць',
    'déplacer',
);

const KeyBindHints: KeyBindHint[] = [
    {
        keys: ['Ctrl', LmbLocale],
        showOn: ['selected'],
        description: MoveLocale,
    },
];

export const MoveSelectionPlugin = new Plugin(
    'graphdlc-move-selection',
    {
        name: 'GraphDLC Move Selection',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin], // TODO: make core plugin instead core & graph
        defaultEnabled: true,
    },
    {
        patches: Patches,
        keyBindHints: KeyBindHints,
    },
);
