import { I18nText } from '@logic-arrows/lang/i18n-text';
import { ToolsSettingGroup } from 'src/core/settings/groups/ToolsGroup';
import { SelectSetting } from 'src/core/settings/types/SelectSetting';

export const enum SaveMode {
    NORMAL = 0,
    CTRL_S_ONLY = 1,
    NEVER = 2,
}

const NameLocale = new I18nText(
    'Save Mode',
    'Режим сохранения',
    'Режим збереження',
    'Рэжым захавання',
    'Mode de sauvegarde',
);

const DescriptionLocale = new I18nText(
    'Choose when and how the map changes are saved',
    'Выберите, когда и как сохраняются изменения карты',
    'Виберіть, коли та як зберігаються зміни карти',
    'Выберыце, калі і як захоўваюцца змены карты',
    'Choisissez quand et comment les modifications de la carte sont enregistrées',
);

const NormalLocale = new I18nText(
    'Normal',
    'Обычный',
    'Звичайний',
    'Звычайны',
    'Normal',
);

const CtrlSOnlyLocale = new I18nText(
    'Ctrl+S only',
    'Только при Ctrl+S',
    'Тільки при Ctrl+S',
    'Тільки пры Ctrl+S',
    'Uniquement via Ctrl+S',
);

const NeverLocale = new I18nText(
    'Never',
    'Никогда',
    'Ніколи',
    'Ніколі',
    'Jamais',
);

export const SaveModeSetting = new SelectSetting<SaveMode>(
    'SaveMode',
    SaveMode.NORMAL,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: true,
        group: ToolsSettingGroup,
        order: 4,
    },
    [
        {
            value: SaveMode.NORMAL,
            label: NormalLocale,
        },
        {
            value: SaveMode.CTRL_S_ONLY,
            label: CtrlSOnlyLocale,
        },
        {
            value: SaveMode.NEVER,
            label: NeverLocale,
        },
    ],
);
