import { BaseSetting } from './BaseSetting';
import type { SettingMeta } from './Types';

export class BoolSetting extends BaseSetting<boolean> {
    public readonly disabled: boolean;

    public constructor(
        key: string,
        defaultValue: boolean,
        meta: SettingMeta,
        disabled = false,
    ) {
        super(key, defaultValue, meta);
        this.disabled = disabled;
    }

    public buildUIComponent(): HTMLInputElement {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.value;
        checkbox.disabled = this.disabled;

        checkbox.addEventListener('change', () => {
            this.value = checkbox.checked;
        });

        return checkbox;
    }
}
