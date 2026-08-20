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
    'Enable snapshot history for tick rewinding (may significantly reduce performance)',
    'Включить сохранение истории для отката тиков (может сильно снизить производительность)',
    'Увімкнути збереження історії для відкату тіків (може сильно знизити продуктивність)',
    'Уключыць захаванне гісторыі для адкату цікаў (можа моцна знізіць прадукцыйнасць)',
    "Activer l'historique des instantanés pour l'annulation des tics (peut réduire considérablement les performances)",
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
