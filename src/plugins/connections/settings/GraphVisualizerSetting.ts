import { I18nText } from '@logic-arrows/lang/i18n-text';
import { ReDesignSettingGroup } from 'src/core/settings/groups/ReDesignGroup';
import { BoolSetting } from 'src/core/settings/types/BoolSetting';

const NameLocale = new I18nText(
    'Enhanced Path Highlighting',
    'Улучшенная подсветка путей',
    'Покращене підсвічування шляхів',
    'Палепшаная падсветка шляхоў',
    'Surbrillance améliorée des chemins',
);

const DescriptionLocale = new I18nText(
    'Makes path connections more clear and distinct',
    'Делает соединения путей более явными',
    'Робить з’єднання шляхів більш виразними',
    'Робіць злучэнні шляхоў больш выразнымі',
    'Rend les connexions des chemins plus distinctes',
);

export const GraphVisualizerSetting = new BoolSetting(
    'GraphConnectionsVisualizer',
    false,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: false,
        group: ReDesignSettingGroup,
        order: 5,
    },
);
