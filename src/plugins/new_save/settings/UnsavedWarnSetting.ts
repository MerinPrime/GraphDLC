import { I18nText } from '@logic-arrows/lang/i18n-text';
import { ToolsSettingGroup } from '../../../core/settings/groups/ToolsGroup';
import { BoolSetting } from '../../../core/settings/types/BoolSetting';

const NameLocale = new I18nText(
    'Warn on Unsaved Changes',
    'Предупреждать о несохранённом',
    'Попереджати про незбережене',
    'Папярэджваць пра незахаванае',
    'Avertir en cas de modifications non enregistrées',
);

const DescriptionLocale = new I18nText(
    'Show confirmation when leaving with unsaved changes',
    'Показывать предупреждение при попытке выйти или закрыть карту без сохранения',
    'Показувати попередження при спробі вийти або закрити карту без збереження',
    'Паказваць папярэджанне пры спробе выйсці або закрыць карту без захавання',
    'Afficher une confirmation lors de la sortie avec des modifications non enregistrées',
);

export const UnsavedWarnSetting = new BoolSetting('UnsavedWarn', false, {
    name: NameLocale,
    description: DescriptionLocale,
    reloadOnChange: false,
    isMapSetting: false,
    group: ToolsSettingGroup,
    order: 6,
});
