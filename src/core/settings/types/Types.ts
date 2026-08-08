import type { I18nText } from '@logic-arrows/lang/i18n-text';
import type { TextColor } from 'src/core/utils/TextColor';
import type { SettingGroup } from './SettingGroup';

export interface SettingMeta {
    readonly name: I18nText;
    readonly description?: I18nText;
    readonly nameColor?: TextColor;
    readonly descriptionColor?: TextColor;

    readonly reloadOnChange?: boolean;
    readonly isMapSetting: boolean;
    readonly group: SettingGroup;
    readonly order: number;
    readonly spaceAfter?: number;
}
