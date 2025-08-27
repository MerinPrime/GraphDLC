import {GraphDLC} from "../core/graphdlc";
import {GameText} from "../api/gameText";
import {I18nText} from "../api/i18nText";

export function PatchSettingsPage(graphDLC: GraphDLC) {
    const patchLoader = graphDLC.patchLoader;
    const settings = graphDLC.settings;
    
    const GameTextPtr = patchLoader.getDefinitionPtr<GameText>("GameText");
    
    patchLoader.addDefinitionPatch("SettingsPage", function (module: any): any {
        patchLoader.setDefinition("SettingsPage", class SettingsPage_GDLC extends module {
            constructor(container: HTMLElement) {
                super(container);
                
                const GameText = GameTextPtr.definition;
                
                this.addSpace();
                this.addRangeSetting(GameText.TARGET_FPS, settings.data.targetFPS, 20, 240, 5, (value: number) => {
                    settings.data.targetFPS = value;
                    settings.save();
                    return `${value} ${GameText.FPS_LOCALE.get()}`;
                });
                this.addBoolSetting(GameText.TPS_COUNTER, settings.data.showTPSInfo, (value: boolean) => {
                    settings.data.showTPSInfo = value;
                    settings.save();
                });
                this.addBoolSetting(GameText.DEBUG_INFO, settings.data.showDebugInfo, (value: boolean) => {
                    settings.data.showDebugInfo = value;
                    settings.save();
                }, true);
                this.addSpace();
                this.addBoolSetting(GameText.SHOW_ARROW_CONNECTIONS, settings.data.showArrowConnections, (value: boolean) => {
                    settings.data.showArrowConnections = value;
                    settings.save();
                });
                this.addBoolSetting(GameText.SHOW_ARROW_TARGET, settings.data.showArrowTarget, (value: boolean) => {
                    settings.data.showArrowTarget = value;
                    settings.save();
                });
                this.addBoolSetting(GameText.FULL_RENDERING, settings.data.fullRendering, (value: boolean) => {
                    settings.data.fullRendering = value;
                    settings.save();
                });
                this.addSpace();
                this.addText(GameText.OPTIMIZATIONS_UNAVAILABLE_LOCALE, 'red');
                this.addBoolSetting(GameText.OPTIMIZE_RINGS, settings.data.optimizeRings, (value: boolean) => {
                    settings.data.optimizeRings = value;
                    settings.save();
                });
                this.addBoolSetting(GameText.OPTIMIZE_BUTTONS, settings.data.optimizeButtons, (value: boolean) => {
                    settings.data.optimizeButtons = value;
                    settings.save();
                }, true);
                this.addBoolSetting(GameText.OPTIMIZE_PIXELS, settings.data.optimizePixels, (value: boolean) => {
                    settings.data.optimizePixels = value;
                    settings.save();
                }, true);
                this.addBoolSetting(GameText.OPTIMIZE_BRANCHES, settings.data.optimizeBranches, (value: boolean) => {
                    settings.data.optimizeBranches = value;
                    settings.save();
                });
                this.addBoolSetting(GameText.OPTIMIZE_PATHS, settings.data.optimizePaths, (value: boolean) => {
                    settings.data.optimizePaths = value;
                    settings.save();
                }, true);
                this.addBoolSetting(GameText.OPTIMIZE_SIMPLE, settings.data.optimizeSimple, (value: boolean) => {
                    settings.data.optimizeSimple = value;
                    settings.save();
                });
                this.addSpace();
                this.addOptionsSetting(GameText.DEBUG_MODE, settings.data.debugMode,
                    [GameText.DEBUG_MODE_1, GameText.DEBUG_MODE_2, GameText.DEBUG_MODE_3, GameText.DEBUG_MODE_4,
                        GameText.DEBUG_MODE_5],
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
            
            addText(text: I18nText, colorCode: string) {
                const errorText = document.createElement("div");
                errorText.style.color = `var(--light-${colorCode})`;
                errorText.innerHTML = text.get();
                this.table.appendChild(errorText);
            }
            
            addRangeSetting(text: I18nText, value: number,
                            min: number, max: number, step: number,
                            callback: (value: number) => string) {
                this.addSetting(text.get(), () => {
                    const container = document.createElement("div");
                    const slider = document.createElement("input");
                    const label = document.createElement("span");

                    slider.type = "range";
                    slider.min = min.toString();
                    slider.max = max.toString();
                    slider.step = step.toString();
                    slider.value = value.toString();

                    slider.addEventListener("change", () => {
                        const value = parseInt(slider.value.toString(), 10);
                        label.innerText = callback(value);
                    });

                    slider.style.display = "inline";
                    label.innerText = callback(value);

                    container.appendChild(slider);
                    container.appendChild(label);

                    return container;
                });
            }
            
            addBoolSetting(text: I18nText, value: boolean, callback: (value: boolean) => void, disabled: boolean = false) {
                this.addSetting(text.get(), () => {
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.checked = value || disabled;
                    checkbox.disabled = disabled;
                    
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