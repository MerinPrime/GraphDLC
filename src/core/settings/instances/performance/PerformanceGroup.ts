import { I18nText } from '@logic-arrows/lang/i18n-text';
import type { SettingGroup } from '../../types/SettingGroup';

export const PerformanceSettingGroup: SettingGroup = {
    text: new I18nText(
        'Performance',
        'Производительность',
        'Продуктивність',
        'Прадукцыйнасць',
        'Performance',
    ),
    order: 0,
};
