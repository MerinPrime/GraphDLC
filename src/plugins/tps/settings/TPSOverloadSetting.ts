import { I18nText } from '@logic-arrows/lang/i18n-text';
import { PerformanceSettingGroup } from 'src/core/settings/groups/PerformanceGroup';
import { BoolSetting } from 'src/core/settings/types/BoolSetting';

const NameLocale = new I18nText(
    'TPS Overload Protection',
    'Защита от перегрузки ТПС',
    'Захист від перевантаження TPS',
    'Абарона ад перагрузкі TPS',
    'Protection contre la surcharge de TPS',
);

const DescriptionLocale = new I18nText(
    'Protects the game from freezing when TPS becomes too high\nTPS may become unstable and can break displays that rely on a specific TPS value',
    'Защищает игру от зависаний при большом количестве ТПС\nТПС может быть нестабильным и может поломать дисплеи, основанные на определённом значении ТПС',
    'Захищає гру від зависань при великій кількості TPS\nTPS може бути нестабільним і може зламати дисплеї, що залежать від певного значення TPS',
    'Абараняе гульню ад завісанняў пры вялікай колькасці TPS\nTPS можа быць нестабільным і можа зламаць дысплеі, якія залежаць ад пэўнага значэння TPS',
    'Protège le jeu contre les blocages lorsque le TPS devient trop élevé\nLe TPS peut devenir instable et perturber les afficheurs qui dépendent d’une valeur de TPS spécifique',
);

export const TPSOverloadSetting = new BoolSetting('TpsOverload', false, {
    name: NameLocale,
    description: DescriptionLocale,
    isMapSetting: false,
    group: PerformanceSettingGroup,
    order: 4,
});
