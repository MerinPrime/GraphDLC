import { I18nText } from '@logic-arrows/lang/i18n-text';
import { BoolSetting } from '../../types/BoolSetting';
import { PerformanceSettingGroup } from './PerformanceGroup';

const NameLocale = new I18nText(
    'TPS OVERLOAD',
    'TPS OVERLOAD',
    'TPS OVERLOAD',
    'TPS OVERLOAD',
    'TPS OVERLOAD',
);

const DescriptionLocale = new I18nText(
    'TPS OVERLOAD',
    'TPS OVERLOAD',
    'TPS OVERLOAD',
    'TPS OVERLOAD',
    'TPS OVERLOAD',
);

export const TPSOverloadSetting = new BoolSetting('TpsOverload', false, {
    name: NameLocale,
    description: DescriptionLocale,
    isMapSetting: false,
    group: PerformanceSettingGroup,
    order: 4,
});
