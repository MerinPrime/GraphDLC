import { I18nText } from '@logic-arrows/lang/i18n-text';
import { ToolsSettingGroup } from 'src/core/settings/groups/ToolsGroup';
import { BoolSetting } from 'src/core/settings/types/BoolSetting';

const NameLocale = new I18nText(
    'Show Arrow Connections',
    'Показывать связи стрелочек',
    'Показувати зв’язки стрілочок',
    'Паказваць сувязі стрэлачак',
    'Afficher les connexions des flèches',
);

const DescriptionLocale = new I18nText(
    'Show where the signal goes from the arrow on hover',
    'Показывать, куда идёт сигнал от стрелочки при наведении',
    'Показувати, куди йде сигнал від стрілочки при наведенні',
    'Паказваць, куды ідзе сігнал ад стрэлачкі пры навядзенні',
    'Afficher où va le signal depuis la flèche au survol',
);

export const ShowArrowConnectionsSetting = new BoolSetting(
    'ShowArrowConnections',
    false,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: false,
        group: ToolsSettingGroup,
        order: 3,
    },
);
