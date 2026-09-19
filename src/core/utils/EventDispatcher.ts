type EventArgs<TListener, K extends keyof TListener> =
    NonNullable<TListener[K]> extends (...args: any[]) => any
        ? Parameters<NonNullable<TListener[K]>>
        : never;

export class EventDispatcher<TListener extends object> {
    private readonly listeners: TListener[] = [];

    public subscribe(listener: TListener): () => void {
        if (!this.listeners.includes(listener)) {
            this.listeners.push(listener);
        }
        return () => this.unsubscribe(listener);
    }

    public unsubscribe(listener: TListener): void {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    public dispatch<K extends keyof TListener>(
        methodName: K,
        ...args: EventArgs<TListener, K>
    ): void {
        const targets = this.listeners.slice();
        const count = targets.length;

        for (let i = 0; i < count; i++) {
            const listener = targets[i];
            const handler = listener[methodName];

            if (typeof handler === 'function') {
                (handler as (...a: unknown[]) => void).apply(listener, args);
            }
        }
    }

    public clear(): void {
        this.listeners.length = 0;
    }

    public get listenerCount(): number {
        return this.listeners.length;
    }
}
