import { I18nText } from '@logic-arrows/lang/i18n-text';
import { PerformanceSettingGroup } from 'src/core/settings/groups/PerformanceGroup';
import { SelectSetting } from 'src/core/settings/types/SelectSetting';
import { IS_WASM_SUPPORTED } from 'src/core/utils/WasmSupport';

export const enum GraphEngine {
    ORIGINAL = 0,
    STANDARD = 1,
    ENHANCED = 2,
    NATIVE = 3,
    NATIVE_EXP = 4,
    NATIVE_EXP_WITH_PATHES = 5,
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

// const EnhancedLocale = new I18nText(
//     'Enhanced',
//     'Улучшенный',
//     'Покращений',
//     'Палепшаны',
//     'Amélioré',
// );

const NativeLocale = new I18nText(
    'Native',
    'Нативный',
    'Нативний',
    'Натыўны',
    'Natif',
);

const NativeExpLocale = new I18nText(
    'Native (Experimental)',
    'Нативный (Экспериментальный)',
    'Нативний (Експериментальний)',
    'Натыўны (Эксперыментальны)',
    'Natif (Expérimental)',
);

const NativeExpPathesLocale = new I18nText(
    'Native (Exp; Paths)',
    'Нативный (Эксп.; Пути)',
    'Нативний (Експ.; Шляхи)',
    'Натыўны (Эксп.; Шляхі)',
    'Natif (Exp.; Chemins)',
);

const DefaultEngine = IS_WASM_SUPPORTED
    ? GraphEngine.NATIVE_EXP
    : GraphEngine.STANDARD;

export const GraphEngineSetting = new SelectSetting<GraphEngine>(
    'GraphEngine',
    DefaultEngine,
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
        // {
        //     value: GraphEngine.ENHANCED,
        //     label: EnhancedLocale,
        // },
        {
            value: GraphEngine.NATIVE,
            label: NativeLocale,
            disabled: !IS_WASM_SUPPORTED,
        },
        {
            value: GraphEngine.NATIVE_EXP,
            label: NativeExpLocale,
            disabled: !IS_WASM_SUPPORTED,
        },
        {
            value: GraphEngine.NATIVE_EXP_WITH_PATHES,
            label: NativeExpPathesLocale,
            disabled: !IS_WASM_SUPPORTED,
        },
    ],
);
