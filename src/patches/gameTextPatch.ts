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

        module.TPS_COUNTER = new I18nText(
            "TPS and FPS counter",
            "Счётчик ТПС и ФПС",
            "Лічильник ТПС і ФПС",
            "Лічыльнік ТПС і ФПС",
            "Compteur TPS et FPS"
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

        module.SHOW_ARROW_TARGET = new I18nText(
            "Show selected arrow output",
            "Показывать выход выбранной стрелочки",
            "Показувати вихід вибраної стрілочки",
            "Паказваць выхад выбранай стрэлачкі",
            "Afficher la sortie de la flèche sélectionnée"
        );

        module.FULL_RENDERING = new I18nText(
            "Detailed view",
            "Подробный вид",
            "Детальний вигляд",
            "Падрабязны выгляд",
            "Vue détaillée"
        );
        
        module.OPTIMIZE_RINGS = new I18nText(
            "Optimize rings and timers",
            "Оптимизация колец",
            "Оптимізація кілець і таймерів",
            "Аптымізацыя кольцаў і таймераў",
            "Optimiser les anneaux et les minuteurs"
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