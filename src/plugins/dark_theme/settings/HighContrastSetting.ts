import { I18nText } from '@logic-arrows/lang/i18n-text';
import { ReDesignSettingGroup } from '../../../core/settings/groups/ReDesignGroup';
import { BoolSetting } from '../../../core/settings/types/BoolSetting';

const NameLocale = new I18nText(
    'High Contrast Arrows',
    'Высокий контраст стрелочек',
    'Високий контраст стрілочок',
    'Высокі кантраст стрэлачак',
    'Flèches à haut contraste',
);

const DescriptionLocale = new I18nText(
    'Increases the brightness of red and blue arrows for better visibility on dark themes',
    'Повышает яркость красных и синих стрелочек для лучшей видимости на тёмной теме',
    'Підвищує яскравість червоних і синіх стрілочок для кращої видимості на темній темі',
    'Павялічвае яркасць чырвоных і сініх стрэлачак для лепшай бачнасці на цёмнай тэме',
    'Augmente la luminosité des flèches rouges et bleues pour une meilleure visibilité sur le thème sombre',
);

export const HighContrastSetting = new BoolSetting('HighContrast', false, {
    name: NameLocale,
    description: DescriptionLocale,
    reloadOnChange: true,
    isMapSetting: false,
    group: ReDesignSettingGroup,
    order: 3,
});
