import { I18nText } from '@logic-arrows/lang/i18n-text';
import { SelectSetting } from '../../types/SelectSetting';
import { OtherSettingGroup } from './OtherGroup';

export const enum DebugMode {
    OFF = 0,
    SHOW_RINGS = 1,
    SHOW_SIGNAL_PROPAGATION = 2,
    SHOW_UNUSED_ARROWS = 3,
}

const NameLocale = new I18nText(
    'Debug Mode',
    'Режим отладки',
    'Режим налагодження',
    'Рэжым адладкі',
    'Mode débogage',
);

const DescriptionLocale = new I18nText(
    'Select debug mode to find bugs and optimization opportunities',
    'Выберите режим отладки для поиска багов и возможностей оптимизации',
    'Виберіть режим налагодження для пошуку багів та можливостей оптимізації',
    'Выберыце рэжым адладкі для пошуку багаў і магчымасцей аптымізацыі',
    "Sélectionnez le mode de débogage pour trouver des bugs et des opportunités d'optimisation",
);

const OffLocale = new I18nText('Off', 'Выкл.', 'Вимк.', 'Выкл.', 'Désactivé');

const ShowRingsLocale = new I18nText(
    'Show rings',
    'Показывать кольца',
    'Показувати кільця',
    'Паказваць кольцы',
    'Afficher les anneaux',
);

const ShowSignalPropagationLocale = new I18nText(
    'Show signal propagation',
    'Показывать прохождение сигнала',
    'Показувати проходження сигналу',
    'Паказваць праходжанне сігналу',
    'Afficher la propagation du signal',
);

const ShowUnusedArrowsLocale = new I18nText(
    'Show unused arrows',
    'Показывать неиспользуемые стрелки',
    'Показувати невикористані стрілки',
    'Паказваць невыкарыстаныя стрэлкі',
    'Afficher les flèches inutilisées',
);

export const DebugModeSetting = new SelectSetting<DebugMode>(
    'DebugMode',
    DebugMode.OFF,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: true,
        group: OtherSettingGroup,
        order: 5,
    },
    [
        {
            value: DebugMode.OFF,
            label: OffLocale,
        },
        {
            value: DebugMode.SHOW_RINGS,
            label: ShowRingsLocale,
        },
        {
            value: DebugMode.SHOW_SIGNAL_PROPAGATION,
            label: ShowSignalPropagationLocale,
        },
        {
            value: DebugMode.SHOW_UNUSED_ARROWS,
            label: ShowUnusedArrowsLocale,
        },
    ],
);
