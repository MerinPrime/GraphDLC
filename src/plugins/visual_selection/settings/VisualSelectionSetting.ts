import { I18nText } from '@logic-arrows/lang/i18n-text';
import { ReDesignSettingGroup } from 'src/core/settings/groups/ReDesignGroup';
import { BoolSetting } from '../../../core/settings/types/BoolSetting';

const NameLocale = new I18nText(
    'New Selection Visual',
    'Новый вид выделения',
    'Новий вигляд виділення',
    'Новы выгляд вылучэння',
    'Nouveau visuel de sélection',
);

const DescriptionLocale = new I18nText(
    'Improves the visual appearance of selection',
    'Улучшает внешний вид выделения',
    'Покращує зовнішній вигляд виділення',
    'Палепшыць знешні выгляд вылучэння',
    "Améliore l'apparence visuelle de la sélection",
);

export const VisualSelectionSetting = new BoolSetting(
    'VisualSelection',
    false,
    {
        name: NameLocale,
        description: DescriptionLocale,
        reloadOnChange: true,
        isMapSetting: false,
        group: ReDesignSettingGroup,
        order: 4,
    },
);
