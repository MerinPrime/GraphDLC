import { I18nText } from '@logic-arrows/lang/i18n-text';
import { ToolsSettingGroup } from 'src/core/settings/groups/ToolsGroup';
import { SelectSetting } from 'src/core/settings/types/SelectSetting';

export const enum BreakpointMode {
    OFF = 0,
    ON = 1,
    ON_ZOOM = 2,
}

const NameLocale = new I18nText(
    'Breakpoint Mode',
    'Режим брейкпоинтов',
    'Режим точок зупину',
    'Рэжым кропак прыпынку',
    "Mode points d'arrêt",
);

const DescriptionLocale = new I18nText(
    'Select breakpoint behavior during execution',
    'Выберите поведение брейкпоинтов во время выполнения',
    'Виберіть поведінку точок зупину під час виконання',
    'Выберыце паводзіны кропак прыпынку падчас выканання',
    "Sélectionnez le comportement des points d'arrêt pendant l'exécution",
);

const OffLocale = new I18nText('Off', 'Выкл.', 'Вимк.', 'Выкл.', 'Désactivé');

const OnLocale = new I18nText('On', 'Вкл.', 'Увімк.', 'Укл.', 'Activé');

const OnZoomLocale = new I18nText(
    'On + Zoom',
    'Вкл. + Зум',
    'Увімк. + Зум',
    'Укл. + Зум',
    'Activé + Zoom',
);

export const EnableBreakpointSetting = new SelectSetting<BreakpointMode>(
    'EnableBreakpoint',
    BreakpointMode.OFF,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: true,
        group: ToolsSettingGroup,
        order: 1,
    },
    [
        {
            value: BreakpointMode.OFF,
            label: OffLocale,
        },
        {
            value: BreakpointMode.ON,
            label: OnLocale,
        },
        {
            value: BreakpointMode.ON_ZOOM,
            label: OnZoomLocale,
        },
    ],
);
