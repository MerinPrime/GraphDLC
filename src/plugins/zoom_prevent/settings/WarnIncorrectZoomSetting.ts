import { I18nText } from '@logic-arrows/lang/i18n-text';
import { OtherSettingGroup } from 'src/core/settings/groups/OtherGroup';
import { BoolSetting } from 'src/core/settings/types/BoolSetting';

const NameLocale = new I18nText(
    'Warn on Incorrect Zoom',
    'Предупреждать о неправильном зуме',
    'Попереджати про неправильний зум',
    'Папярэджваць пра няправільны зум',
    'Avertir en cas de zoom incorrect',
);

const DescriptionLocale = new I18nText(
    'Show an alert when browser zoom is not 100%',
    'Показывать предупреждение, если масштаб браузера отличается от 100%',
    'Показувати попередження, якщо масштаб браузера відрізняється від 100%',
    'Паказваць папярэджанне, калі маштаб браўзера адрозніваецца ад 100%',
    "Afficher une alerte lorsque le niveau de zoom du navigateur n'est pas à 100%",
);

export const WarnIncorrectZoomSetting = new BoolSetting(
    'WarnIncorrectZoom',
    false,
    {
        name: NameLocale,
        description: DescriptionLocale,
        reloadOnChange: false,
        isMapSetting: false,
        group: OtherSettingGroup,
        order: 0,
    },
);
