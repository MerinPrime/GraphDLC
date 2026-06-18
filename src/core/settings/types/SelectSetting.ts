import type { I18nText } from '@logic-arrows/lang/i18n-text';
import { BaseSetting } from './BaseSetting';
import type { SettingMeta } from './Types';

interface Option<T> {
    value: T;
    label: I18nText;
    disabled?: boolean;
}

export class SelectSetting<T extends string | number> extends BaseSetting<T> {
    private readonly options: Option<T>[];

    public constructor(
        key: string,
        defaultValue: T,
        meta: SettingMeta,
        options: Option<T>[],
    ) {
        super(key, defaultValue, meta);
        this.options = options;
    }

    public validate(value: T): boolean {
        return this.options.some((opt) => opt.value === value && !opt.disabled);
    }

    public buildUIComponent(): HTMLSelectElement {
        const select = document.createElement('select');

        this.options.forEach((opt) => {
            const el = document.createElement('option');
            el.value = opt.value.toString();
            el.innerText = opt.label.get();
            el.disabled = opt.disabled ?? false;
            select.appendChild(el);
        });

        select.value = this.value.toString();

        select.addEventListener('change', () => {
            const val =
                typeof this.defaultValue === 'number'
                    ? parseInt(select.value, 10)
                    : select.value;

            if (this.validate(val as T)) {
                this.value = val as T;
            } else {
                select.value = this.value.toString();
            }
        });

        return select;
    }
}
