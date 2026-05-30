import type { I18nText } from '@logic-arrows/lang/i18n-text';
import type { TextColor } from 'src/core/utils/TextColor';

export interface SettingGroup {
    readonly text: I18nText;
    readonly color?: TextColor;
    readonly order?: number;
}
