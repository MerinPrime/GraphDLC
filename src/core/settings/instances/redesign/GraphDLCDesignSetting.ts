import { I18nText } from '@logic-arrows/lang/i18n-text';
import { BoolSetting } from '../../types/BoolSetting';
import { ReDesignSettingGroup } from './ReDesignGroup';

const NameLocale = new I18nText(
    'GraphDLC Design',
    'Дизайн GraphDLC',
    'Дизайн GraphDLC',
    'Дызайн GraphDLC',
    'Design GraphDLC',
);

const DescriptionLocale = new I18nText(
    'Enable or disable the design of default GraphDLC components (does not affect the game redesign)',
    'Включить или выключить дизайн дефолтных компонентов GraphDLC (не затрагивает редизайн самой игры)',
    'Увімкнути або вимкнути дизайн дефолтних компонентів GraphDLC (не впливає на редизайн самої гри)',
    'Уключыць ці выключыць дызайн дэфолтных кампанентаў GraphDLC (не ўплывае на рэдызайн самой гульні)',
    "Activer ou désactiver le design des composants GraphDLC par défaut (n'affecte pas la refonte du jeu)",
);

export const GraphDLCDesignSetting = new BoolSetting(
    'GraphDLCDesign',
    true,
    {
        name: NameLocale,
        description: DescriptionLocale,
        isMapSetting: false,
        group: ReDesignSettingGroup,
        order: 0,
    },
    true,
);
