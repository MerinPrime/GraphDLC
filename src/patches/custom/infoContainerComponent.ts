import {CUIComponent} from "./cuiComponent";
import {GraphDLC} from "../../core/graphdlc";
import {TPSInfoComponent} from "./tpsInfoComponent";

export class InfoContainerComponent extends CUIComponent {
    private graphDLC: GraphDLC;

    tpsInfo: TPSInfoComponent;
    
    constructor(graphDLC: GraphDLC) {
        super(document.body);
        this.element.classList.add("graphdlc-info");
        
        this.graphDLC = graphDLC;
        this.graphDLC.infoContainer = this;

        this.tpsInfo = new TPSInfoComponent(graphDLC, this.element);
    }
    
    remove() {
        this.element.remove();
        this.graphDLC.infoContainer = undefined;
    }
}