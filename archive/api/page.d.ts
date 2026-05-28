import {Game} from "./game";
import {PlayerUI} from "./playerUI";

export interface Page {
    mainDiv: HTMLElement;
}

export type PageProto = new (
    container: HTMLElement
) => Page;
