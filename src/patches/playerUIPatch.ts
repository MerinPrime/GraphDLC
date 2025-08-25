import { GraphDLC } from "../core/graphdlc";
import {UIRangeProto} from "../api/uiRange";
import {InfoContainerComponent} from "./custom/infoContainerComponent";
import {PlayerUIProto} from "../api/playerUI";

export function PatchPlayerUI(graphDLC: GraphDLC) {
    const patchLoader = graphDLC.patchLoader;
    
    const UIRangePtr = patchLoader.getDefinitionPtr<UIRangeProto>("UIRange");
    
    patchLoader.addDefinitionPatch("PlayerUI", function (module: PlayerUIProto): any {
        patchLoader.setDefinition("PlayerUI", class PlayerUI_GDLC extends module {
            addSpeedController() {
                const UIRange = UIRangePtr.definition;
                
                this.speedController = new UIRange(document.body, 9, (e: number) => {
                    return ['3', '12', '60', '300', '1200', '6000', '30000', '120000', 'MAX'][e] + ' TPS';
                });
                
                this.gdlcInfoContainer = new InfoContainerComponent(graphDLC);
            }
            
            removeSpeedController() {
                super.removeSpeedController();
                this.gdlcInfoContainer?.remove();
            }
        });
    });
}

