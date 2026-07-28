import type { SettingMeta } from './Types';

export type SettingChangeListener<T> = (newValue: T, oldValue: T) => void;

export class SettingEvent<T> {
    private readonly listeners = new Set<SettingChangeListener<T>>();

    public add(callback: SettingChangeListener<T>): void {
        this.listeners.add(callback);
    }

    public remove(callback: SettingChangeListener<T>): boolean {
        return this.listeners.delete(callback);
    }

    public emit(newValue: T, oldValue: T): void {
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
    public readonly key: string;
    public readonly defaultValue: T;
    public readonly meta: SettingMeta;
    public readonly disabled: boolean;
    public _value: T;

    public readonly onChange = new SettingEvent<T>();

    public constructor(
        key: string,
        defaultValue: T,
        meta: SettingMeta,
        disabled: boolean = false,
    ) {
        this.key = key;
        this.defaultValue = defaultValue;
        this.meta = meta;
        this._value = defaultValue;
        this.disabled = disabled;
    }

    public get value(): T {
        return this._value;
    }

    public set value(newValue: T) {
        const oldValue = this._value;

        if (newValue !== oldValue && this.validate(newValue)) {
            this._value = newValue;
            this.onChange.emit(newValue, oldValue);
        }
    }

    public validate(_value: T): boolean {
        return true;
    }

    public abstract buildUIComponent(): HTMLElement;
}
