import { LayersDLC } from "../core/layersDLC";
import {I18nTextConstructor} from "../api/i18ntext";
import {GameText} from "../api/gametext";


export function PatchGameText(layersDLC: LayersDLC) {
    layersDLC.patchLoader.addDefinitionPatch("GameText", function (module: GameText): any {
        const I18nText = layersDLC.patchLoader.getDefinition<I18nTextConstructor>("I18nText");

        module.TPS_UPDATE_FREQUENCY_MS = new I18nText(
            "TPS counter update speed (ms)",
            "Скорость обновления счётчика ТПС (мс)",
            "Швидкість оновлення лічильника ТПС (мс)",
            "Хуткасць абнаўлення лічыльніка ТПС (мс)",
            "Vitesse de mise à jour du compteur TPS (ms)"
        );
        
        module.OPTIMIZE_RINGS = new I18nText(
            "Optimize rings and timers",
            "Оптимизация колец и таймеров",
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
    });
}