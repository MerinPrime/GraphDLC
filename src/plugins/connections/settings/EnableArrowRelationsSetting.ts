import { I18nText } from '@logic-arrows/lang/i18n-text';
import { ToolsSettingGroup } from 'src/core/settings/groups/ToolsGroup';
import { BoolSetting } from 'src/core/settings/types/BoolSetting';

const NameLocale = new I18nText(
    'Enable Arrow Relations',
    'Показывать связи стрелочек',
    'Показувати зв’язки стрілочок',
    'Паказваць сувязі стрэлачак',
    'Activer les relations des flèches',
);

const DescriptionLocale = new I18nText(
    'Show where the signal goes from the selected arrow',
    'Показывать, куда идёт сигнал от выбранной стрелочки',
    'Показувати, куди йде сигнал від вибраної стрілочки',
    'Паказваць, куды ідзе сігнал ад выбранай стрэлачкі',
    'Afficher où va le signal depuis la flèche sélectionnée',
);

export const EnableArrowRelationsSetting = new BoolSetting(
    'EnableArrowRelations',
    false,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: false,
        group: ToolsSettingGroup,
        order: 2,
    },
);
