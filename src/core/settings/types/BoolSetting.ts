import { BaseSetting } from './BaseSetting';
import type { SettingMeta } from './Types';

export class BoolSetting extends BaseSetting<boolean> {
    public constructor(
        key: string,
        defaultValue: boolean,
        meta: SettingMeta,
        disabled: boolean = false,
    ) {
        super(key, defaultValue, meta, disabled);
    }

    public buildUIComponent(): HTMLInputElement {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.value;
        checkbox.disabled = this.disabled;

        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.value = checkbox.checked;
            if (this.meta.reloadOnChange) window.location.reload();
        });

        ['pointerdown', 'touchstart', 'mousedown', 'touchend'].forEach(
            (evt) => {
                checkbox.addEventListener(evt, (e) => e.stopPropagation(), {
                    passive: false,
                });
            },
        );

        return checkbox;
    }
}
