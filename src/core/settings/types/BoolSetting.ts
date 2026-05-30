import { BaseSetting } from "./BaseSetting";
import { SettingMeta } from "./Types";

export class BoolSetting extends BaseSetting<boolean> {
    readonly disabled: boolean;

    constructor(key: string, defaultValue: boolean, meta: SettingMeta, disabled = false) {
        super(key, defaultValue, meta);
        this.disabled = disabled;
    }

    buildUIComponent(): HTMLInputElement {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = this.value;
        checkbox.disabled = this.disabled;

        checkbox.addEventListener("change", () => {
            this.value = checkbox.checked;
        });

        return checkbox;
    }
}
