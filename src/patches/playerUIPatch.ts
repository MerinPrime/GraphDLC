import { GraphDLC } from "../core/graphdlc";
import {UIRangeProto} from "../api/uiRange";
import {InfoContainerComponent} from "./custom/infoContainerComponent";
import {PlayerUIProto} from "../api/playerUI";
import {CustomTPSComponent} from "./custom/customTPSComponent";

export function PatchPlayerUI(graphDLC: GraphDLC) {
    const patchLoader = graphDLC.patchLoader;
    
    const UIRangePtr = patchLoader.getDefinitionPtr<UIRangeProto>("UIRange");
    
    patchLoader.addDefinitionPatch("PlayerUI", function (module: PlayerUIProto): any {
        patchLoader.setDefinition("PlayerUI", class PlayerUI_GDLC extends module {
            addSpeedController() {
                const UIRange = UIRangePtr.definition;
                
                this.speedController = new UIRange(document.body, 10, (e: number) => {
                    graphDLC.customUI.customTPSField?.setVisibility(e === 9);
                    return ['3', '12', '60', '300', '1200', '6000', '30000', '120000', 'MAX', 'CUSTOM'][e] + ' TPS';
                });
                
                graphDLC.customUI.customTPSField = new CustomTPSComponent(this.speedController.element);
                graphDLC.customUI.infoContainer = new InfoContainerComponent(graphDLC);
            }
            
            removeSpeedController() {
                graphDLC.customUI.customTPSField?.remove();
                graphDLC.customUI.infoContainer?.remove();
                super.removeSpeedController();
            }
            
            dispose() {
                graphDLC.customUI.customTPSField?.remove();
                graphDLC.customUI.infoContainer?.remove();
                super.dispose();
            }
        });
    });
}

