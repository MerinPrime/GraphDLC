import { I18nText } from '@logic-arrows/lang/i18n-text';
import { isWasmSupported } from 'src/core/utils/WasmSupport';
import { SelectSetting } from '../../types/SelectSetting';
import { PerformanceSettingGroup } from './PerformanceGroup';

export const enum GraphEngine {
    ORIGINAL = 0,
    STANDARD = 1,
    ENHANCED = 2,
    NATIVE = 3,
}

const NameLocale = new I18nText(
    'Graph Optimization Engine',
    'Движок оптимизации графа',
    'Двигун оптимізації графа',
    'Рухавік аптымізацыі графа',
    "Moteur d'optimisation de graphe",
);

const DescriptionLocale = new I18nText(
    'Switch the graph simulation engine if you encounter bugs',
    'Смените движок симуляции графа, если возникают баги',
    'Змініть двигун симуляції графа, якщо виникають баги',
    'Змяніце рухавік сімуляцыі графа, калі ўзнікаюць памылкі',
    'Changez le moteur de simulation de graphe si vous rencontrez des bugs',
);

const OriginalLocale = new I18nText(
    'Original',
    'Оригинальный',
    'Оригінальний',
    'Арыгінальны',
    'Original',
);

const StandardLocale = new I18nText(
    'Standard',
    'Стандартный',
    'Стандартний',
    'Стандартны',
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
            value: GraphEngine.ORIGINAL,
            label: OriginalLocale,
        },
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
