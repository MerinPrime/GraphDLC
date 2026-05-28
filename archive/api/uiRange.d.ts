import {UIComponent} from "./uiComponent";

export interface UIRange extends UIComponent {
    thumb: HTMLDivElement;
    textElement: HTMLSpanElement;
    mousePressed: boolean;
    mouseOffset: number;
    value: number;
    maxValue: number;
    rect: DOMRect;
    thumbRect: DOMRect;
    messageCallback: (value: number) => string;

    getClass(): string;
    isMouseCaptured(): boolean;
    getValue(): number;
    remove(): void;
    mouseDown(e: PointerEvent): void;
    mouseUp(): void;
    mouseMove(e: PointerEvent): void;
}

export type UIRangeProto = new (
    element: HTMLElement,
    maxValue: number,
    messageCallback?: (value: number) => string
) => UIRange;
