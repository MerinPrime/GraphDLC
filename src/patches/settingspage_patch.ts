import {LayersDLC} from "../core/layersDLC";
import {GameText} from "../api/gametext";
import {I18nText} from "../api/i18ntext";

export function PatchSettingsPage(layersDLC: LayersDLC) {
    const settings = layersDLC.settings;
    
    layersDLC.patchLoader.addDefinitionPatch("SettingsPage", function (module: any): any {
        layersDLC.patchLoader.setDefinition("SettingsPage", class SettingsPageLDLC extends module {
            constructor(container: HTMLElement) {
                super(container);
                const GameText = layersDLC.patchLoader.getDefinition<GameText>("GameText");
                this.addSpace()
                this.addBoolSetting(GameText.OPTIMIZE_RINGS, settings.data.optimizeRings, (value: boolean) => {
                    settings.data.optimizeRings = value;
                    settings.save();
                });
                this.addBoolSetting(GameText.OPTIMIZE_BUTTONS, settings.data.optimizeButtons, (value: boolean) => {
                    settings.data.optimizeButtons = value;
                    settings.save();
                });
                this.addBoolSetting(GameText.OPTIMIZE_PIXELS, settings.data.optimizePixels, (value: boolean) => {
                    settings.data.optimizePixels = value;
                    settings.save();
                });
                this.addBoolSetting(GameText.OPTIMIZE_BRANCHES, settings.data.optimizeBranches, (value: boolean) => {
                    settings.data.optimizeBranches = value;
                    settings.save();
                });
                this.addBoolSetting(GameText.OPTIMIZE_PATHS, settings.data.optimizePaths, (value: boolean) => {
                    settings.data.optimizePaths = value;
                    settings.save();
                });
                this.addSpace();
                this.addOptionsSetting(GameText.DEBUG_MODE, settings.data.debugMode,
                    [GameText.DEBUG_MODE_1, GameText.DEBUG_MODE_2, GameText.DEBUG_MODE_3, GameText.DEBUG_MODE_4],
                    (index, value) => {
                    settings.data.debugMode = index;
                    settings.save();
                });
            }
            
            addSpace() {
                const space = document.createElement("div");
                space.classList.add("settings-space");
                this.table.appendChild(space);
            }
            
            addBoolSetting(text: I18nText, value: boolean, callback: (value: boolean) => void) {
                this.addSetting(text.get(), () => {
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.checked = value;
                    
                    checkbox.addEventListener("change", () => {
                        callback(checkbox.checked);
                    });
                    
                    return checkbox;
                });
            }
            
            addOptionsSetting(text: I18nText, value: number, options: I18nText[], callback: (index: number, value: I18nText) => void) {
                this.addSetting(text.get(), () => {
                    const select = document.createElement("select");
                    for (let i = 0; i < options.length; i++) {
                        const optionText = options[i];
                        const option = document.createElement("option");
                        option.value = `${i}`;
                        option.innerText = optionText.get();
                        select.appendChild(option);
                    }
                    select.value = `${value}`;
                    
                    select.addEventListener("change", () => {
                        const index = parseInt(select.value, 10);
                        callback(index, options[index]);
                    });
                    
                    return select;
                });
            }
        });
    });
}