import { I18nText } from '@logic-arrows/lang/i18n-text';
import { BoolSetting } from '../../types/BoolSetting';
import { ReDesignSettingGroup } from './ReDesignGroup';

const NameLocale = new I18nText(
    'Dark Theme',
    'Тёмная тема',
    'Темна тема',
    'Цёмная тэма',
    'Thème sombre',
);

const DescriptionLocale = new I18nText(
    'Enable or disable the dark theme in the game',
    'Включить или выключить тёмную тему в игре',
    'Увімкнути або вимкнути темну тему в грі',
    'Уключыць ці выключыць цёмную тэму ў гульні',
    'Activer ou désactiver le thème sombre dans le jeu',
);

export const DarkThemeSetting = new BoolSetting('DarkTheme', false, {
    name: NameLocale,
    description: DescriptionLocale,
    reloadOnChange: true,
    isMapSetting: false,
    group: ReDesignSettingGroup,
    order: 2,
});
