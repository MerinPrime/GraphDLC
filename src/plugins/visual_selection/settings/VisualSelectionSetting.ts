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
    'Enable enhanced selection visuals (may cause significant performance drops when selecting large arrow groups)',
    'Включить улучшенный визуал выделения (может значительно снижать производительность при выделении больших схем)',
    'Увімкнути покращений вигляд виділення (може значно знижувати продуктивність під час виділення великих схем)',
    'Уключыць палепшаны выгляд вылучэння (можа значна зніжаць прадукцыйнасць пры вылучэнні вялікіх схем)',
    'Activer les effets visuels améliorés de sélection (peut fortement réduire les performances lors de la sélection de un grand nombre de flèches)',
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
