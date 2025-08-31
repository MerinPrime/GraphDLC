import {CUIComponent} from "./cuiComponent";
import {GraphDLC} from "../../core/graphdlc";
import {TPSInfoComponent} from "./tpsInfoComponent";

export class InfoContainerComponent extends CUIComponent {
    private readonly tpsInfo: TPSInfoComponent;
    
    constructor(graphDLC: GraphDLC) {
        super(document.body);
        this.element.classList.add("graphdlc-info");
        
        this.tpsInfo = new TPSInfoComponent(graphDLC, this.element);
        
        graphDLC.customUI.tpsInfo = this.tpsInfo;
    }
}