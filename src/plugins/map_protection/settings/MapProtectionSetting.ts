import { I18nText } from '@logic-arrows/lang/i18n-text';
import { ToolsSettingGroup } from 'src/core/settings/groups/ToolsGroup';
import { BoolSetting } from 'src/core/settings/types/BoolSetting';

const NameLocale = new I18nText(
    'Map Protection',
    'Защита карты',
    'Захист карти',
    'Абарона карты',
    'Protection de la carte',
);

const DescriptionLocale = new I18nText(
    'Protect the map from saving (changes will not be saved)',
    'Защита карты от сохранения (изменения не будут сохраняться)',
    'Захист карти від збереження (зміни не зберігатимуцца)',
    'Абарона карты ад захавання (змены не будуць захоўвацца)',
    'Protéger la carte contre la sauvegarde (les modifications ne seront pas enregistrées)',
);

export const MapProtectionSetting = new BoolSetting('MapProtection', false, {
    name: NameLocale,
    description: DescriptionLocale,
    isMapSetting: true,
    group: ToolsSettingGroup,
    order: 4,
});
