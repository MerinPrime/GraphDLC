import { I18nText } from '@logic-arrows/lang/i18n-text';
import { isWasmSupported } from 'src/core/utils/WasmSupport';
import { SelectSetting } from '../../types/SelectSetting';
import { PerformanceSettingGroup } from './PerformanceGroup';

export const enum GraphEngine {
    STANDARD = 0,
    ENHANCED = 1,
    NATIVE = 2,
}

const NameLocale = new I18nText(
    'Graph Optimization Engine',
    'Движок оптимизации графа',
    'Двигун оптимізації графа',
    'Рухавік аптымізацыі графа',
    "Moteur d'optimisation de graphe",
);

const DescriptionLocale = new I18nText(
    'Select the graph simulation engine. Change if you encounter bugs.',
    'Выберите движок симуляции графа. Измените в случае возникновения багов.',
    'Виберіть двигун симуляції графа. Змініть у разі виникнення багів.',
    'Выберыце рухавік сімуляцыі графа. Змяніце ў выпадку ўзнікнення багаў.',
    'Sélectionnez le moteur de simulation de graphe. Modifiez en cas de bugs.',
);

const StandardLocale = new I18nText(
    'Standard',
    'Стандартный',
    'Стандартний',
    'Standard',
    'Standard',
);

const EnhancedLocale = new I18nText(
    'Enhanced',
    'Улучшенный',
    'Покращений',
    'Палепшаны',
    'Amélioré',
);

const NativeLocale = new I18nText(
    'Native (Experimental)',
    'Нативный (Экспериментальный)',
    'Нативний (Експериментальний)',
    'Натыўны (Эксперыментальны)',
    'Natif (Expérimental)',
);

const canNative = isWasmSupported();
export const GraphEngineSetting = new SelectSetting<GraphEngine>(
    'GraphEngine',
    GraphEngine.STANDARD,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: false,
        group: PerformanceSettingGroup,
        order: 0,
    },
    [
        {
            value: GraphEngine.STANDARD,
            label: StandardLocale,
        },
        {
            value: GraphEngine.ENHANCED,
            label: EnhancedLocale,
        },
        {
            value: GraphEngine.NATIVE,
            label: NativeLocale,
            disabled: !canNative,
        },
    ],
);
if (canNative) {
    GraphEngineSetting.value = GraphEngine.NATIVE;
}
