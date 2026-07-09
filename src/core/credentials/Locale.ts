import { I18nText } from '@logic-arrows/lang/i18n-text';
import { RepoLatestRelease } from './version/Utils';

export const GraphDLCPrefix = 'GraphDLC: ';

export const LatestVersionTextLocale = new I18nText(
    'Latest version',
    'Последняя версия',
    'Остання версія',
    'Апошняя версія',
    'Dernière version',
);

export const VersionUnknownLocale = new I18nText(
    'Unknown',
    'Неизвестно',
    'Невідомо',
    'Невядома',
    'Inconnu',
);

const RepoHREF = `<a href="${RepoLatestRelease}" target="_blank">GitHub</a>`;

export const OutdatedVersionLocale = new I18nText(
    `Your version is outdated. Please update it on ${RepoHREF}.`,
    `Ваша версия устарела. Пожалуйста, обновите её на ${RepoHREF}.`,
    `Ваша версія застаріла. Будь ласка, оновіться на ${RepoHREF}.`,
    `Ваша версія састарэла. Калі ласка, абнавіце яе на ${RepoHREF}.`,
    `Votre version est obsolète. Veuillez la mettre à jour sur ${RepoHREF}.`,
);
