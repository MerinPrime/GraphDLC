import { I18nText } from '@logic-arrows/lang/i18n-text';
import type { SettingGroup } from '../types/SettingGroup';

export const DeveloperSettingGroup: SettingGroup = {
    text: new I18nText(
        'Developer',
        'Разработка',
        'Розробка',
        'Распрацоўка',
        'Développement',
    ),
    order: 2,
};
