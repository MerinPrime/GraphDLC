import { I18nText } from '@logic-arrows/lang/i18n-text';
import { BoolSetting } from '../../types/BoolSetting';
import { OtherSettingGroup } from './OtherGroup';

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

export const EnableSnapshotsSetting = new BoolSetting('EnableSnapshots', true, {
    name: NameLocale,
    description: DescriptionLocale,
    isMapSetting: true,
    group: OtherSettingGroup,
    order: 6,
});
