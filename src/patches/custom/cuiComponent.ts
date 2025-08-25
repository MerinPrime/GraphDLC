export class CUIComponent {
    parent: HTMLElement;
    element: HTMLElement;
    
    constructor(parent: HTMLElement) {
        this.parent = parent;
        this.element = document.createElement("div");
        this.element.classList.add("cuicomponent");
        this.parent.appendChild(this.element);
    }
    
    setVisibility(visibility: boolean) {
        this.element.hidden = !visibility;
    }
}