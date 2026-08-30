import { I18nText } from '@logic-arrows/lang/i18n-text';
import { DeveloperSettingGroup } from '../groups/DeveloperGroup';
import { BoolSetting } from '../types/BoolSetting';

const NameLocale = new I18nText(
    'Ring RAM Optimization',
    'Оптимизация колец',
    'Оптимізація кілець',
    'Аптымізацыя кольцаў',
    'Optimisation de la RAM circulaire',
);

const DescriptionLocale = new I18nText(
    'Optimizes ring RAM',
    'Оптимизирует кольцевое ОЗУ',
    'Оптимізує кільцевий ОЗП',
    'Аптымізуе кальцавую АЗП',
    'Optimise la mémoire RAM circulaire',
);

export const CycleOptimizationSetting = new BoolSetting(
    'CycleOptimization',
    true,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: false,
        group: DeveloperSettingGroup,
        order: 2,
        isDeveloperOnly: true,
    },
);
