import { I18nText } from '@logic-arrows/lang/i18n-text';
import { ReDesignSettingGroup } from '../../groups/ReDesignGroup';
import { BoolSetting } from '../../types/BoolSetting';

const NameLocale = new I18nText(
    'QoL Redesign',
    'QoL Редизайн',
    'QoL Редизайн',
    'QoL Рэдызайн',
    'Redesign QoL',
);

const DescriptionLocale = new I18nText(
    'Enable or disable minor visual improvements',
    'Включить или выключить небольшие визуальные улучшения',
    'Увімкнути або вимкнути невеликі візуальні покращення',
    'Уключыць ці выключыць невялікія візуальныя паляпшэнні',
    'Activer ou désactiver de légères améliorations visuelles',
);

export const QoLReDesignSetting = new BoolSetting('QoLReDesign', true, {
    name: NameLocale,
    description: DescriptionLocale,
    isMapSetting: false,
    group: ReDesignSettingGroup,
    order: 1,
});
