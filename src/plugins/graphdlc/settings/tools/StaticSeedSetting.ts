import { I18nText } from '@logic-arrows/lang/i18n-text';
import { ToolsSettingGroup } from 'src/core/settings/groups/ToolsGroup';
import { NumberSetting } from 'src/core/settings/types/NumberSetting';

const NameLocale = new I18nText(
    'Static Seed',
    'Статический сид',
    'Статичний сід',
    'Статычны сід',
    'Seed statique',
);

const DescriptionLocale = new I18nText(
    'Seed for deterministic debugging. 0 = random.',
    'Сид для детерминированной отладки. 0 = случайный.',
    'Сід для детермінованого налагодження. 0 = випадковий.',
    'Сід для дэтэрмінаванага адладжвання. 0 = выпадковы.',
    'Seed pour le débogage déterministe. 0 = aléatoire.',
);

export const StaticSeedSetting = new NumberSetting(
    'StaticSeed',
    0,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: true,
        group: ToolsSettingGroup,
        order: 6,
    },
    {
        min: 0,
        max: 0xffffffff,
        inputType: 'number',
        formatLabel: () => '',
    },
);
