import { GraphDLC } from "../core/graphdlc";
import {I18nTextProto} from "../api/i18nText";
import {GameText} from "../api/gameText";


export function PatchGameText(graphDLC: GraphDLC) {
    const patchLoader = graphDLC.patchLoader;
    
    const I18nTextPtr = patchLoader.getDefinitionPtr<I18nTextProto>("I18nText");
    
    patchLoader.addDefinitionPatch("GameText", function (module: GameText): any {
        const I18nText = I18nTextPtr.definition;
        
        module.TPS_UPDATE_FREQUENCY_MS = new I18nText(
            "TPS counter update speed (ms)",
            "Скорость обновления счётчика ТПС (мс)",
            "Швидкість оновлення лічильника ТПС (мс)",
            "Хуткасць абнаўлення лічыльніка ТПС (мс)",
            "Vitesse de mise à jour du compteur TPS (ms)"
        );

        module.TARGET_FPS = new I18nText(
            "Target FPS",
            "Целевой ФПС",
            "Цільовий FPS",
            "Мэтавы FPS",
            "FPS cible"
        );

        module.TARGET_FPS_DESC = new I18nText(
            "Target FPS for MAX TPS mode",
            "Целевой FPS для режима MAX TPS",
            "Цільовий FPS для режиму MAX TPS",
            "Мэтавы FPS для рэжыму MAX TPS",
            "FPS cible pour le mode MAX TPS"
        );

        module.TPS_COUNTER = new I18nText(
            "TPS and FPS counter",
            "Счётчик ТПС и ФПС",
            "Лічильник ТПС і ФПС",
            "Лічыльнік ТПС і ФПС",
            "Compteur TPS et FPS"
        );

        module.TPS_COUNTER_DESC = new I18nText(
            "Now you can brag about your arrow speed!",
            "Теперь можно хвастаться скоростью стрелочек!",
            "Тепер можна хизуватися швидкістю стрілочок!",
            "Цяпер можна хваліцца хуткасцю стрэлачак!",
            "Vous pouvez désormais vous vanter de la vitesse des flèches !"
        );

        module.DEBUG_INFO = new I18nText(
            "Debug information",
            "Дебаг информация",
            "Інформація для налагодження",
            "Дэбаг інфармацыя",
            "Informations de débogage"
        );

        module.SHOW_ARROW_CONNECTIONS = new I18nText(
            "Show arrow connections",
            "Показывать связи стрелочек",
            "Показувати зв’язки стрілочок",
            "Паказваць сувязі стрэлачак",
            "Afficher les connexions des flèches"
        );

        module.SHOW_ARROW_CONNECTIONS_DESC = new I18nText(
            "Show arrow connections on hover",
            "Показывать связи стрелки при наведении",
            "Показувати зв'язки стрілки при наведенні",
            "Паказваць сувязі стрэлкі пры навядзенні",
            "Afficher les connexions des flèches au survol"
        );

        module.SHOW_ARROW_TARGET = new I18nText(
            "Show selected arrow output",
            "Показывать выход выбранной стрелочки",
            "Показувати вихід вибраної стрілочки",
            "Паказваць выхад выбранай стрэлачкі",
            "Afficher la sortie de la flèche sélectionnée"
        );

        module.SHOW_ARROW_TARGET_DESC = new I18nText(
            "Show arrow target on selection",
            "Показывать, куда идёт сигнал от стрелки",
            "Показувати, куди йде сигнал від стрілки",
            "Паказваць, куды ідзе сігнал ад стрэлкі",
            "Afficher la cible de la flèche lors de la sélection"
        );

        module.FULL_RENDERING = new I18nText(
            "Detailed view",
            "Подробный вид",
            "Детальний вигляд",
            "Падрабязны выгляд",
            "Vue détaillée"
        );

        module.FULL_RENDERING_DESC = new I18nText(
            "Detailed view even during runtime",
            "Подробная визуализация без паузы",
            "Детальна візуалізація без паузи",
            "Падрабязная візуалізацыя без прыпынку",
            "Rendu détaillé même en cours d'exécution"
        );
        
        module.OPTIMIZE_RINGS = new I18nText(
            "Optimize rings",
            "Оптимизация колец",
            "Оптимізація кілець",
            "Аптымізацыя кольцаў",
            "Optimiser les anneaux"
        );

        module.OPTIMIZE_RINGS_DESC = new I18nText(
            "Optimizes ring memory",
            "Оптимизирует кольцевое ОЗУ",
            "Оптимізує кільцеву пам'ять",
            "Аптымізуе кольцавае АЗП",
            "Optimise la mémoire circulaire"
        );

        module.OPTIMIZE_BUTTONS = new I18nText(
            "Improve button response",
            "Улучшение отклика кнопок",
            "Поліпшення відгуку кнопок",
            "Паляпшэнне водгуку кнопак",
            "Améliorer la réactivité des boutons"
        );

        module.OPTIMIZE_PIXELS = new I18nText(
            "Optimize pixels",
            "Оптимизация пикселей",
            "Оптимізація пікселів",
            "Аптымізацыя пікселяў",
            "Optimiser les pixels"
        );

        module.OPTIMIZE_BRANCHES = new I18nText(
            "Optimize branches",
            "Оптимизация ветвлений",
            "Оптимізація розгалужень",
            "Аптымізацыя галінаванняў",
            "Optimiser les branches"
        );

        module.OPTIMIZE_BRANCHES_DESC = new I18nText(
            "Combines shared paths after branching",
            "Комбинирует общий путь после ветвлений",
            "Комбінує спільні шляхи після розгалужень",
            "Камбіруе агульны шлях пасля разгалужэнняў",
            "Combine les chemins partagés après les branches"
        );

        module.OPTIMIZE_PATHS = new I18nText(
            "Optimize paths",
            "Оптимизация путей",
            "Оптимізація шляхів",
            "Аптымізацыя шляхоў",
            "Optimisation des chemins"
        );

        module.OPTIMIZE_SIMPLE = new I18nText(
            "Simple optimization",
            "Простая оптимизация",
            "Проста оптимізація",
            "Простая аптымізацыя",
            "Optimisation simple"
        );

        module.OPTIMIZE_SIMPLE_DESC = new I18nText(
            "Optimizes detectors, blockers, and XOR",
            "Оптимизирует детекторы, блокеры и XOR",
            "Оптимізує детектори, блокери та XOR",
            "Оптымізуе дэтэктары, блакеры і XOR",
            "Optimise détecteurs, bloqueurs et XOR"
        );

        module.OPTIMIZE_TIMERS = new I18nText(
            "Optimize timers",
            "Оптимизация таймеров",
            "Оптимізація таймерів",
            "Аптымізацыя таймераў",
            "Optimiser les minuteurs"
        );

        module.DEBUG_MODE = new I18nText(
            "Debug mode",
            "Режим дебага",
            "Режим дебагу",
            "Рэжым дэбагу",
            "Mode débogage"
        );

        module.DEBUG_MODE_DESC = new I18nText(
            "Select debug mode to find bugs and optimization opportunities",
            "Выбор режима отладки для поиска багов и мест оптимизации",
            "Вибір режиму відладки для пошуку багів і місць оптимізації",
            "Выбар рэжыму адладкі для пошуку памылак і месцаў аптымізацыі",
            "Sélection du mode de débogage pour trouver des bugs et des possibilités d'optimisation"
        );

        module.DEBUG_MODE_1 = new I18nText(
            "Off",
            "Отключен",
            "Вимкнено",
            "Адключаны",
            "Désactivé"
        );

        module.DEBUG_MODE_2 = new I18nText(
            "Show optimizations",
            "Показывать оптимизации",
            "Показувати оптимізації",
            "Паказваць аптымізацыі",
            "Afficher les optimisations"
        );

        module.DEBUG_MODE_3 = new I18nText(
            "Show signal propagation",
            "Показывать распространение сигнала",
            "Показувати поширення сигналу",
            "Паказваць распаўсюджанне сігналу",
            "Afficher la propagation du signal"
        );

        module.DEBUG_MODE_4 = new I18nText(
            "Show unused arrows",
            "Показывать неиспользуемые стрелочки",
            "Показувати невикористані стрілочки",
            "Паказваць нявыкарыстаныя стрэлкі",
            "Afficher les flèches inutilisées"
        );

        module.DEBUG_MODE_5 = new I18nText(
            "Disable updates",
            "Отключить обновление",
            "Вимкнути оновлення",
            "Адключыць абнаўленне",
            "Désactiver les mises à jour"
        );

        module.DEBUG_MODE_5 = new I18nText(
            "Disable updates",
            "Отключить обновление",
            "Вимкнути оновлення",
            "Адключыць абнаўленне",
            "Désactiver les mises à jour"
        );

        module.TPS_LOCALE = new I18nText(
            "TPS",
            "ТПС",
            "ТПС",
            "ТПС",
            "TPS"
        );

        module.FPS_LOCALE = new I18nText(
            "FPS",
            "ФПС",
            "ФПС",
            "ФПС",
            "FPS"
        );

        module.OPTIMIZATIONS_UNAVAILABLE_LOCALE = new I18nText(
            "Some optimizations are unavailable",
            "Некоторые оптимизации недоступны",
            "Деякі оптимізації недоступні",
            "Некаторыя аптымізацыі недаступныя",
            "Certaines optimisations sont indisponibles"
        );
    });
}