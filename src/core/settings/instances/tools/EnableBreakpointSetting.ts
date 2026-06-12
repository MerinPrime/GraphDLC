import { I18nText } from '@logic-arrows/lang/i18n-text';
import { BoolSetting } from '../../types/BoolSetting';
import { ToolsSettingGroup } from './ToolsGroup';

const NameLocale = new I18nText(
    'Enable Breakpoints',
    'Включить брейкпоинты',
    'Увімкнути точки зупину',
    'Уключыць кропкі прыпынку',
    "Activer les points d'arrêt",
);

const DescriptionLocale = new I18nText(
    'Enable or disable breakpoints during execution',
    'Включить или выключить брейкпоинты во время выполнения',
    'Увімкнути або вимкнути точки зупину під час виконання',
    'Уключыць ці выключыць кропкі прыпынку падчас выканання',
    "Activer ou désactiver les points d'arrêt pendant l'exécution",
);

export const EnableBreakpointSetting = new BoolSetting(
    'EnableBreakpoint',
    false,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: true,
        group: ToolsSettingGroup,
        order: 1,
    },
);
