import {GraphDLC} from "../core/graphdlc";
import {GameText} from "../api/gameText";
import {I18nText} from "../api/i18nText";
import {Page, PageProto} from "../api/page";
import {BoolSettingKey, NumberSettingKey, SettingKey, SettingsData} from "../core/settings";

export enum TextColor {
    BLACK = "rgb(0, 0, 0)",
    GRAY = "rgb(80, 80, 80)",
    BLUE = "rgb(55, 95, 187)",
    GREEN = "rgb(40, 220, 70)",
    RED = "rgb(216, 34, 34)",
}

export function PatchSettingsPage(graphDLC: GraphDLC) {
    const patchLoader = graphDLC.patchLoader;
    const settings = graphDLC.settings;
    
    const GameTextPtr = patchLoader.getDefinitionPtr<GameText>("GameText");
    
    patchLoader.addDefinitionPatch("SettingsPage", function (module: any): any {
        const PageProtoPtr = patchLoader.getDefinitionPtr<PageProto>("Page");
        const LangSettingsPtr = patchLoader.getDefinitionPtr<any>("LangSettings");
        const LangUtilsPtr = patchLoader.getDefinitionPtr<any>("LangUtils");
        const PageProto = PageProtoPtr.definition;
        patchLoader.setDefinition("SettingsPage", class SettingsPage extends PageProto {
            table: HTMLTableElement;

            constructor(container: HTMLElement) {
                super(container);

                this.table = this.createTable();
                this.mainDiv.appendChild(this.table);

                const GameText = GameTextPtr.definition;

                this.addSetting(
                    GameText.LANGUAGE.get(),
                    () => this.createLanguageSelect()
                );

                this.addSetting(
                    GameText.SHOW_CONTROLS_HINTS.get(),
                    () => this.createControlsHintsCheckbox()
                );

                this.addSetting(
                    GameText.MAX_ZOOM_OUT.get(),
                    () => this.createMaxZoomSlider()
                );

                this.addSpace();
                this.addSetting(GameText.TARGET_FPS.get(), () => this.addRangeSetting('targetFPS', 20, 240, 5,
                    (value) => `${value} ${GameText.FPS_LOCALE.get()}`), GameText.TARGET_FPS_DESC.get());
                this.addSpace(0.5);
                this.addSetting(GameText.TPS_COUNTER.get(), () => this.addBoolSetting('showTPSInfo'), GameText.TPS_COUNTER_DESC.get());
                this.addSpace(0.5);
                // this.addBoolSetting(GameText.DEBUG_INFO, settings.data.showDebugInfo, (value: boolean) => {
                //     settings.data.showDebugInfo = value;
                //     settings.save();
                // }, true);
                // this.addSpace(0.5);
                this.addSpace(1.5);
                this.addSetting(GameText.SHOW_ARROW_CONNECTIONS.get(), () => this.addBoolSetting('showArrowConnections'), GameText.SHOW_ARROW_CONNECTIONS_DESC.get());
                this.addSpace(0.5);
                this.addSetting(GameText.SHOW_ARROW_TARGET.get(), () => this.addBoolSetting('showArrowTarget'), GameText.SHOW_ARROW_TARGET_DESC.get());
                this.addSpace(0.5);
                this.addSetting(GameText.FULL_RENDERING.get(), () => this.addBoolSetting('fullRendering'), GameText.FULL_RENDERING_DESC.get());
                this.addSpace(0.5);
                this.addSpace(1.5);
                // this.addText(GameText.OPTIMIZATIONS_UNAVAILABLE_LOCALE, TextColor.RED);
                // this.addSpace(0.5);
                this.addSetting(GameText.OPTIMIZE_RINGS.get(), () => this.addBoolSetting('optimizeRings'), GameText.OPTIMIZE_RINGS_DESC.get());
                this.addSpace(0.5);
                // this.addSetting(GameText.OPTIMIZE_BUTTONS.get(), () => this.addBoolSetting('optimizeButtons', true), GameText.OPTIMIZE_SIMPLE_DESC.get(), TextColor.RED);
                // this.addSpace(0.5);
                // this.addSetting(GameText.OPTIMIZE_PIXELS.get(), () => this.addBoolSetting('optimizePixels', true), GameText.OPTIMIZE_SIMPLE_DESC.get(), TextColor.RED);
                // this.addSpace(0.5);
                this.addSetting(GameText.OPTIMIZE_BRANCHES.get(), () => this.addBoolSetting('optimizeBranches'), GameText.OPTIMIZE_BRANCHES_DESC.get());
                this.addSpace(0.5);
                // this.addSetting(GameText.OPTIMIZE_PATHS.get(), () => this.addBoolSetting('optimizePaths', true), null, TextColor.RED);
                // this.addSpace(0.5);
                this.addSetting(GameText.OPTIMIZE_SIMPLE.get(), () => this.addBoolSetting('optimizeSimple'), GameText.OPTIMIZE_SIMPLE_DESC.get());
                this.addSpace(0.5);
                this.addSpace(1.5);
                this.addSetting(GameText.DEBUG_MODE.get(), () => this.createDebugModeOptions(), GameText.DEBUG_MODE_DESC.get());
            }
            
            getClass(): string {
                return "settings-page";
            }

            addText(text: I18nText, textColor: TextColor) {
                const errorText = document.createElement("div");
                errorText.style.color = textColor;
                errorText.innerHTML = text.get();
                this.table.appendChild(errorText);
            }

            private createDebugModeOptions(): HTMLElement {
                const GameText = GameTextPtr.definition;
                return this.createOptionsSetting(settings.data.debugMode,
                    [GameText.DEBUG_MODE_1, GameText.DEBUG_MODE_2, GameText.DEBUG_MODE_3,
                     GameText.DEBUG_MODE_4, GameText.DEBUG_MODE_5],
                    (index, value) => {
                    settings.data.debugMode = index;
                    settings.save();
                });
            }

            private addRangeSetting(settingKey: NumberSettingKey,
                            min: number, max: number, step: number, callback: (value: number) => string) {
                const container = document.createElement("div");
                const slider = document.createElement("input");
                const label = document.createElement("span");

                slider.type = "range";
                slider.min = min.toString();
                slider.max = max.toString();
                slider.step = step.toString();
                slider.value = settings.data[settingKey].toString();

                slider.addEventListener("input", () => {
                    const value = parseInt(slider.value.toString(), 10);
                    label.innerText = callback(value);
                    settings.data[settingKey] = value;
                    settings.save();
                });

                slider.style.display = "inline";
                label.innerText = callback(settings.data[settingKey]);

                container.appendChild(slider);
                container.appendChild(label);

                return container;
            }

            private addBoolSetting(settingKey: BoolSettingKey, disabled: boolean = false) {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = settings.data[settingKey] || disabled;
                checkbox.disabled = disabled;

                checkbox.addEventListener("change", () => {
                    settings.data[settingKey] = checkbox.checked;
                    settings.save();
                });

                return checkbox;
            }

            private createOptionsSetting(value: number, options: I18nText[], callback: (index: number, value: I18nText) => void): HTMLElement {
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
            }
            
            private createTable(): HTMLTableElement {
                const table = document.createElement("table");
                table.classList.add("settings-table");
                return table;
            }
            
            private addSpace(size: number = 1) {
                const space = document.createElement("div");
                space.style.height = `${size}vh`;
                this.table.appendChild(space);
            }
            
            private addSetting(
                label: string,
                controlFactory: () => HTMLElement,
                description: string | null = null,
                labelColor: TextColor = TextColor.BLACK,
                descriptionColor: TextColor = TextColor.GRAY,
            ): void {
                const row = document.createElement("tr");
                this.table.appendChild(row);

                const nameCell = document.createElement("td");
                nameCell.classList.add("setting-name");

                const labelText = document.createElement("div");
                labelText.innerText = `${label}:`;
                labelText.style.color = labelColor;
                nameCell.appendChild(labelText);

                if (description) {
                    const descText = document.createElement("div");
                    descText.classList.add("setting-description");
                    descText.innerText = description;
                    descText.style.color = descriptionColor;
                    nameCell.appendChild(descText);
                }

                row.appendChild(nameCell);

                const valueCell = document.createElement("td");
                valueCell.classList.add("setting-value");
                valueCell.appendChild(controlFactory());
                row.appendChild(valueCell);
            }

            private createLanguageSelect(): HTMLSelectElement {
                const LangSettings = LangSettingsPtr.definition;
                const LangUtils = LangUtilsPtr.definition;
                
                const select = document.createElement("select");
                select.classList.add("lang-select");

                LangSettings.languages.forEach((lang: string, idx: number) => {
                    const option = document.createElement("option");
                    option.value = lang;
                    option.innerText = LangSettings.languageNames[idx];
                    select.appendChild(option);
                });

                select.value = LangSettings.getLanguage();

                select.addEventListener("change", () => {
                    const lang = LangUtils.getLanguageFromString(select.value);
                    LangSettings.setLanguage(lang);
                    localStorage.setItem("lang", lang);
                    window.location.reload();
                });

                return select;
            }

            private createControlsHintsCheckbox(): HTMLInputElement {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = localStorage.getItem("show-controls-hints") !== "false";

                checkbox.addEventListener("change", () => {
                    localStorage.setItem("show-controls-hints", checkbox.checked.toString());
                });

                return checkbox;
            }

            private createMaxZoomSlider(): HTMLDivElement {
                const container = document.createElement("div");
                const slider = document.createElement("input");
                const valueText = document.createElement("span");

                slider.type = "range";
                slider.min = "1";
                slider.max = "4";
                slider.step = "1";
                slider.value = localStorage.getItem("max-zoom-out") || "1";
                slider.style.display = "inline";

                valueText.innerText = `${slider.value}x`;
                valueText.className = "setting-max-zoom-out-text";

                slider.addEventListener("change", () => {
                    localStorage.setItem("max-zoom-out", slider.value);
                    valueText.innerText = `${slider.value}x`;
                });

                container.appendChild(slider);
                container.appendChild(valueText);

                return container;
            }
        });
    });
}
