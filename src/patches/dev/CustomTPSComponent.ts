export class CustomTPSComponent {
    public readonly parent: HTMLElement;
    public readonly field: HTMLInputElement;
    public isRemoved: boolean;
    public tps: number;

    public constructor(parent: HTMLElement, hasPause: boolean) {
        this.parent = parent;
        this.isRemoved = false;
        this.tps = 0;

        this.field = document.createElement('input');
        this.field.type = 'number';
        this.field.min = '1';
        this.field.max = '10000000';
        this.field.value = '1';
        this.field.classList.add('custom-tps-input');

        if (hasPause) {
            this.field.classList.add('has-pause');
        }

        this.field.addEventListener('change', () => {
            const parsedValue = parseInt(this.field.value, 10);
            const value = Number.isNaN(parsedValue) ? 1 : parsedValue;
            this.tps = Math.max(1, Math.min(value, 10000000));
            this.field.value = this.tps.toString(10);
        });

        this.parent.appendChild(this.field);
        this.setVisibility(false);

        this.field.setAttribute('inputmode', 'none');

        this.field.addEventListener('click', () => {
            this.field.setAttribute('inputmode', 'numeric');
            this.field.focus();
        });
    }

    public getTicksPerFrame(): number {
        return Math.max(1, Math.round(this.tps / 60.0));
    }

    public isFocused(): boolean {
        if (this.isRemoved) return false;
        return this.field === document.activeElement;
    }

    public focus() {
        this.field.focus();
    }

    public blur() {
        this.field.blur();
    }

    public setVisibility(visibility: boolean): void {
        if (this.isRemoved) return;
        const beHidden = this.field.hidden;
        this.field.hidden = !visibility;
        if (beHidden && visibility) {
            this.focus();
        }
    }

    public remove() {
        this.isRemoved = true;
        this.field.remove();
    }
}
