import type { SettingMeta } from './Types';

export abstract class BaseSetting<T> {
    readonly key: string;
    readonly defaultValue: T;
    readonly meta: SettingMeta;
    _value: T;

    constructor(key: string, defaultValue: T, meta: SettingMeta) {
        this.key = key;
        this.defaultValue = defaultValue;
        this.meta = meta;
        this._value = defaultValue;
    }

    get value(): T {
        return this._value;
    }

    set value(newValue: T) {
        if (this.validate(newValue)) {
            this._value = newValue;
        }
    }

    validate(_value: T): boolean {
        return true;
    }

    abstract buildUIComponent(): HTMLElement;
}
