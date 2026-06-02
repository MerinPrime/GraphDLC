import { I18nText } from '@logic-arrows/lang/i18n-text';
import { BoolSetting } from '../../types/BoolSetting';
import { OtherSettingGroup } from './OtherGroup';

const NameLocale = new I18nText(
    'Show arrow connections',
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
        group: OtherSettingGroup,
        order: 3,
    },
);
