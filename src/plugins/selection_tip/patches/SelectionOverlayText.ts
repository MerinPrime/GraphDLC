export class SelectionOverlayText {
    private text: string;
    private element: HTMLDivElement | null = null;

    public constructor(text: string = '') {
        this.text = text;
    }

    public add(parent: HTMLElement): void {
        if (this.element !== null) return;

        this.element = document.createElement('div');
        this.element.innerText = this.text;
        parent.appendChild(this.element);

        this.element.style.position = 'absolute';
        this.element.style.userSelect = 'none';
        this.element.style.whiteSpace = 'nowrap';
        this.element.style.pointerEvents = 'none';
        this.element.style.fontFamily = 'Nunito';
        this.element.style.color = 'rgb(70, 100, 165)';
        this.element.style.fontSize = '15px';
        this.element.style.zIndex = '9999';
    }

    public setText(text: string): void {
        this.text = text;
        if (this.element !== null) {
            this.element.innerText = text;
        }
    }

    public setVisibility(state: boolean): void {
        if (this.element !== null) {
            this.element.hidden = !state;
        }
    }

    public setPosition(
        mouseX: number,
        mouseY: number,
        alignX: 'left' | 'right',
        alignY: 'top' | 'bottom' | 'center' = 'center',
        offsetX: number = 10,
        offsetY: number = offsetX,
    ): void {
        if (this.element === null) return;

        let left = 0;
        let top = 0;
        let translateX = 0;
        let translateY = 0;

        if (alignX === 'right') {
            left = mouseX + offsetX;
            translateX = 0;
            this.element.style.textAlign = 'left';
        } else {
            left = mouseX - offsetX;
            translateX = -100;
            this.element.style.textAlign = 'right';
        }

        if (alignY === 'top') {
            top = mouseY - offsetY;
            translateY = -100;
        } else if (alignY === 'bottom') {
            top = mouseY + offsetY;
            translateY = 0;
        } else {
            top = mouseY;
            translateY = -50;
        }

        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;

        this.element.style.transform = `translate(${translateX}%, ${translateY}%)`;
    }

    public remove(): void {
        if (this.element === null) return;
        this.element.remove();
        this.element = null;
    }
}
