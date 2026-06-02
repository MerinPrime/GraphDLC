import type { I18nText } from '@logic-arrows/lang/i18n-text';
import type { TextColor } from 'src/core/utils/TextColor';
import type { SettingGroup } from './SettingGroup';

export interface SettingMeta {
    name: I18nText;
    description?: I18nText;
    nameColor?: TextColor;
    descriptionColor?: TextColor;

    isMapSetting: boolean;
    group: SettingGroup;
    order: number;
    spaceAfter?: number;
}
