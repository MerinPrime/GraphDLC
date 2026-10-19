import { I18nText } from '@logic-arrows/lang/i18n-text';
import { PerformanceSettingGroup } from 'src/core/settings/groups/PerformanceGroup';
import { BoolSetting } from 'src/core/settings/types/BoolSetting';

const NameLocale = new I18nText(
    'Enable History',
    'Включить историю',
    'Увімкнути історію',
    'Уключыць гісторыю',
    "Activer l'historique",
);

const DescriptionLocale = new I18nText(
    'Enable snapshot history for tick rewinding (may hurt performance; rewinds may be unstable)',
    'Включить сохранение истории для отката тиков (может снизить производительность; откат может работать некорректно)',
    'Увімкнути збереження історії для відкату тіків (може знизити продуктивність; відкат може працювати некоректно)',
    'Уключыць захаванне гісторыі для адкату цікаў (можа знізіць прадукцыйнасць; адкат можа працаваць некарэктна)',
    "Activer l'historique des instantanés pour revenir en arrière dans les ticks (peut réduire les performances ; le retour en arrière peut être instable)",
);

export const EnableSnapshotsSetting = new BoolSetting(
    'EnableSnapshots',
    false,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: true,
        group: PerformanceSettingGroup,
        order: 2,
    },
);
