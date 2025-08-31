import {CUIComponent} from "./cuiComponent";

export class CustomTPSComponent extends CUIComponent {
    private readonly field: HTMLInputElement;
    private tps: number;
    
    constructor(parent: HTMLElement) {
        super(parent);

        this.tps = 0;
        
        this.element.classList.add("custom-tps-container");
        
        this.field = document.createElement('input');
        this.field.type = 'number';
        this.field.min = '1';
        this.field.max = '1000000';
        this.field.value = '1';
        this.field.classList.add('custom-tps-input');
        
        this.field.addEventListener('change', () => {
            const parsedValue = parseInt(this.field.value);
            const value = Number.isNaN(parsedValue) ? 1 : parsedValue;
            this.tps = Math.max(1, Math.min(value, 1000000))
            this.field.value = this.tps.toString(10);
        });
        
        this.element.appendChild(this.field);
        this.setVisibility(false);
    }
    
    getTicksPerFrame(): number {
        return Math.max(1, Math.round(this.tps / 60.0));
    }
    
    isFocused(): boolean {
        if (this.isRemoved) return false;
        return this.field === document.activeElement;
    }
    
    focus() {
        this.field.focus();
    }
    
    blur() {
        this.field.blur();
    }
    
    setVisibility(visibility: boolean): void {
        if (this.isRemoved) return;
        const beHidden = this.element.hidden;
        super.setVisibility(visibility);
        if (beHidden && visibility) {
            this.focus();
        }
    }
}