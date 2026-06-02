import { I18nText } from '@logic-arrows/lang/i18n-text';
import { NumberSetting } from '../types/NumberSetting';
import { OtherSettingGroup } from './OtherGroup';

const NameLocale = new I18nText(
    'Target FPS',
    'Целевой ФПС',
    'Цільовий FPS',
    'Мэтавы FPS',
    'FPS cible',
);

const DescriptionLocale = new I18nText(
    'Target FPS for MAX TPS mode',
    'Целевой FPS для режима MAX TPS',
    'Цільовий FPS для режиму MAX TPS',
    'Мэтавы FPS для рэжыму MAX TPS',
    'FPS cible pour le mode MAX TPS',
);

const FPSFormatLocale = new I18nText('FPS', 'ФПС', 'ФПС', 'ФПС', 'FPS');

const FPSFormatFunc = (value: number) => `${value} ${FPSFormatLocale.get()}`;

export const TargetFPSSetting = new NumberSetting(
    'TargetFPS',
    60,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: false,
        group: OtherSettingGroup,
        order: 0,
    },
    {
        min: 20,
        max: 240,
        step: 5,
        formatLabel: FPSFormatFunc,
    },
);
