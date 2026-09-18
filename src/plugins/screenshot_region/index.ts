import { I18nText } from '@logic-arrows/lang/i18n-text';
import { type KeyBindHint, Plugin, PluginPriority } from '../core/Plugin';
import { PatchGame } from './patches/PatchGame';
import { PatchPlayerControls } from './patches/PatchPlayerControls';

const Patches = [PatchGame, PatchPlayerControls];

const ScreenshotRegionLocale = new I18nText(
    'screenshot',
    'скриншот',
    'знімок екрана',
    'здымак экрана',
    'capture d’écran',
);

const KeyBindHints: KeyBindHint[] = [
    {
        keys: ['L'],
        showOn: ['selected'],
        description: ScreenshotRegionLocale,
    },
];

export const ScreenshotPlugin = new Plugin(
    'graphdlc-screenshot',
    {
        name: 'GraphDLC Screenshot',
        priority: PluginPriority.MEDIUM,
        dependencies: [],
        defaultEnabled: true,
    },
    {
        patches: Patches,
        keyBindHints: KeyBindHints,
    },
);
