export interface UIComponent {
    element: HTMLElement;
    isRemoved: boolean;
    mutationObserver: MutationObserver;
    
    getRect(): DOMRect;
    setVisibility(visibility: boolean): void;
    getIsRemoved(): boolean;
    remove();
}

export type UIComponentProto = new (
    parent: HTMLElement
) => UIComponent;