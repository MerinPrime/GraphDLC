import { I18nText } from '@logic-arrows/lang/i18n-text';
import { NumberSetting } from '../../types/NumberSetting';
import { PerformanceSettingGroup } from './PerformanceGroup';

const NameLocale = new I18nText(
    'Cycle Search Budget',
    'Бюджет поиска циклов',
    'Бюджет пошуку циклів',
    'Бюджэт пошуку циклаў',
    'Budget de recherche de cycles',
);

const DescriptionLocale = new I18nText(
    'Time limit per frame for asynchronous cycle finding\nSet to 0 to enable synchronous mode',
    'Лимит времени на кадр для асинхронного поиска циклов\nУстановите 0 для включения синхронного режима',
    'Ліміт часу на кадр для асинхронного пошуку циклів\nВстановіть 0 для увімкнення синхронного режиму',
    'Ліміт часу на кадр для асінхроннага пошуку циклаў\nУсталюйце 0 для ўключэння сінхроннага рэжыму',
    'Limite de temps par image pour la recherche de cycles asynchrone\nDéfinissez sur 0 pour activer le mode synchrone',
);

const SyncLocale = new I18nText(
    'Synchronous',
    'Синхронно',
    'Синхронно',
    'Сінхронна',
    'Synchrone',
);

const MsFormatLocale = new I18nText('ms', 'мс', 'мс', 'мс', 'ms');

const FormatFunc = (value: number) => {
    if (value === 0) {
        return SyncLocale.get();
    }
    return `${value} ${MsFormatLocale.get()}`;
};

export const CycleBudgetSetting = new NumberSetting(
    'CycleBudget',
    16,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: false,
        group: PerformanceSettingGroup,
        order: 3,
    },
    {
        min: 0,
        max: 16,
        step: 1,
        formatLabel: FormatFunc,
    },
);
