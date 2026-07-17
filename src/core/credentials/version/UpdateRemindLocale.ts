import { I18nText } from '@logic-arrows/lang/i18n-text';

export const UpdateAvailableLocale = new I18nText(
    'Update available',
    'Доступно обновление',
    'Доступне оновлення',
    'Даступна абнаўленне',
    'Mise à jour disponible',
);

export const YourVersionLocale = new I18nText(
    (args) => `Your version: <b>${args[0]}</b>`,
    (args) => `Ваша версия: <b>${args[0]}</b>`,
    (args) => `Ваша версія: <b>${args[0]}</b>`,
    (args) => `Ваша версія: <b>${args[0]}</b>`,
    (args) => `Votre version : <b>${args[0]}</b>`,
);

export const LatestVersionLocale = new I18nText(
    (args) => `Latest version: <b>${args[0]}</b>`,
    (args) => `Последняя версия: <b>${args[0]}</b>`,
    (args) => `Остання версія: <b>${args[0]}</b>`,
    (args) => `Апошняя версія: <b>${args[0]}</b>`,
    (args) => `Dernière version : <b>${args[0]}</b>`,
);

export const IgnoreLocale = new I18nText(
    'Skip',
    'Пропустить',
    'Пропустити',
    'Прапусціць',
    'Ignorer',
);

export const LaterLocale = new I18nText(
    'Later',
    'Позже',
    'Пізніше',
    'Пазней',
    'Plus tard',
);

export const UpdateLocale = new I18nText(
    'Update',
    'Обновить',
    'Оновити',
    'Абнавіць',
    'Mettre à jour',
);
