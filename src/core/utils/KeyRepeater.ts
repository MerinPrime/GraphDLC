export class KeyRepeater {
    private active = false;
    private startTime = 0;
    private lastTriggerTime = 0;

    public constructor(
        private readonly initialDelay = 400,
        private readonly interval = 50,
    ) {}

    public update(isPressed: boolean, action: () => void): void {
        if (!isPressed) {
            this.active = false;
            return;
        }

        const now = performance.now();

        if (!this.active) {
            this.active = true;
            this.startTime = now;
            this.lastTriggerTime = now;
            action();
        } else if (
            now - this.startTime >= this.initialDelay &&
            now - this.lastTriggerTime >= this.interval
        ) {
            this.lastTriggerTime = now;
            action();
        }
    }
}
