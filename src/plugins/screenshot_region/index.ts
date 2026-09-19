import { I18nText } from '@logic-arrows/lang/i18n-text';
import { type KeyBindHint, Plugin, PluginPriority } from '../core/Plugin';
import { CorePlugin } from '../graphdlc';
import { PatchGame } from './patches/PatchGame';
import { PatchPlayerControls } from './patches/PatchPlayerControls';
import { PatchPlayerUI } from './patches/PatchPlayerUI';
import pluginStyle from './style.scss?raw';

const Patches = [PatchGame, PatchPlayerControls, PatchPlayerUI];

export const ScreenshotLocale = new I18nText(
    'screenshot',
    'скриншот',
    'знімок екрана',
    'здымак экрана',
    'capture d’écran',
);

export const RecordLocale = new I18nText(
    'record',
    'запись',
    'запис',
    'запіс',
    'enregistrement',
);

const KeyBindHints: KeyBindHint[] = [
    {
        keys: ['L'],
        showOn: ['selected'],
        description: ScreenshotLocale,
    },
    {
        keys: ['Shift', 'L'],
        showOn: ['selected'],
        description: RecordLocale,
    },
    // {
    //     keys: ['Alt', 'L'],
    //     showOn: ['selected'],
    //     description: ScreenshotRegionLocale,
    // },
];

export const ScreenshotPlugin = new Plugin(
    'graphdlc-screenshot',
    {
        name: 'GraphDLC Screenshot',
        priority: PluginPriority.MEDIUM,
        dependencies: [CorePlugin],
        defaultEnabled: true,
    },
    {
        patches: Patches,
        keyBindHints: KeyBindHints,
        customStyle: pluginStyle,
    },
);
