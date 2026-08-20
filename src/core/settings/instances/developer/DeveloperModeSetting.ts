import { I18nText } from '@logic-arrows/lang/i18n-text';
import { DeveloperSettingGroup } from '../../groups/DeveloperGroup';
import { BoolSetting } from '../../types/BoolSetting';

const NameLocale = new I18nText(
    'Developer Mode',
    'Режим разработчика',
    'Режим розробника',
    'Рэжым распрацоўшчыка',
    'Mode développeur',
);

const DescriptionLocale = new I18nText(
    'Allows changing hidden settings',
    'Позволяет изменять скрытые настройки',
    'Дозволяє змінювати приховані налаштування',
    'Дазваляе змяняць схаваныя налады',
    'Permet de modifier les paramètres cachés',
);

export const DeveloperModeSetting = new BoolSetting('DeveloperMode', false, {
    name: NameLocale,
    description: DescriptionLocale,
    isMapSetting: false,
    group: DeveloperSettingGroup,
    order: 0,
    isDeveloperOnly: true,
    reloadOnChange: true,
});
