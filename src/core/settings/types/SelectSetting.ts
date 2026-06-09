import type { I18nText } from '@logic-arrows/lang/i18n-text';
import { BaseSetting } from './BaseSetting';
import type { SettingMeta } from './Types';

export class SelectSetting<T extends string | number> extends BaseSetting<T> {
    private readonly options: { value: T; label: I18nText }[];

    public constructor(
        key: string,
        defaultValue: T,
        meta: SettingMeta,
        options: { value: T; label: I18nText }[],
    ) {
        super(key, defaultValue, meta);
        this.options = options;
    }

    public buildUIComponent(): HTMLSelectElement {
        const select = document.createElement('select');
        this.options.forEach((opt) => {
            const el = document.createElement('option');
            el.value = opt.value.toString();
            el.innerText = opt.label.get();
            select.appendChild(el);
        });
        select.value = this.value.toString();

        select.addEventListener('change', () => {
            const val =
                typeof this.defaultValue === 'number'
                    ? parseInt(select.value, 10)
                    : select.value;
            this.value = val as T;
        });
        return select;
    }
}
