import type { SettingMeta } from './Types';

export type SettingChangeListener<T> = (newValue: T, oldValue: T) => void;

export class SettingEvent<T> {
    private readonly listeners = new Set<SettingChangeListener<T>>();

    add(callback: SettingChangeListener<T>): void {
        this.listeners.add(callback);
    }

    remove(callback: SettingChangeListener<T>): boolean {
        return this.listeners.delete(callback);
    }

    emit(newValue: T, oldValue: T): void {
        this.listeners.forEach((callback) => {
            try {
                callback(newValue, oldValue);
            } catch (error) {
                console.error('Error in setting change listener:', error);
            }
        });
    }
}

export abstract class BaseSetting<T> {
    readonly key: string;
    readonly defaultValue: T;
    readonly meta: SettingMeta;
    _value: T;

    readonly onChange = new SettingEvent<T>();

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
        const oldValue = this._value;

        if (newValue !== oldValue && this.validate(newValue)) {
            this._value = newValue;
            this.onChange.emit(newValue, oldValue);
        }
    }

    validate(_value: T): boolean {
        return true;
    }

    abstract buildUIComponent(): HTMLElement;
}
