export type ChangeListener<T> = (newValue: T, oldValue: T) => void;

export class ReactiveValue<T> {
    private _value: T;
    private readonly listeners = new Set<ChangeListener<T>>();

    public constructor(value: T) {
        this._value = value;
    }

    public get value(): T {
        return this._value;
    }

    public set value(newValue: T) {
        const oldValue = this._value;

        if (newValue === oldValue) return;

        this._value = newValue;
        this.emit(newValue, oldValue);
    }

    public add(callback: ChangeListener<T>): void {
        this.listeners.add(callback);
    }

    public remove(callback: ChangeListener<T>): boolean {
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
