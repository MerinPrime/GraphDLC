export class CUIComponent {
    parent: HTMLElement;
    element: HTMLElement;
    isRemoved: boolean;
    
    constructor(parent: HTMLElement) {
        this.parent = parent;
        this.element = document.createElement("div");
        this.element.classList.add("cuicomponent");
        this.parent.appendChild(this.element);
        this.isRemoved = false;
    }
    
    setVisibility(visibility: boolean) {
        this.element.hidden = !visibility;
    }
    
    remove() {
        this.isRemoved = true;
        this.element.remove();
    }
}