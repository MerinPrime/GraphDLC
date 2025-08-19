import { LayersDLC } from "../core/layersdlc";
import { ITPSInfo } from "./tpsinfo_patch";

export function PatchPlayerUI(layersdlc: LayersDLC) {
    layersdlc.patchLoader.addDefinitionPatch("PlayerUI", function (module: any): any {
        layersdlc.patchLoader.setDefinition("PlayerUI", class PlayerUI extends module {
            addSpeedController() {
                const UIRange = layersdlc.patchLoader.getDefinition<any>('UIRange');
                const TPSInfoD = layersdlc.patchLoader.getDefinition<any>('TPSInfo');

                this.speedController = new UIRange(document.body, 9, (e: number) => {
                    return ['3', '12', '60', '300', '1200', '6000', '30000', '120000', 'MAX'][e] + ' TPS';
                });
                layersdlc.tpsInfo = new TPSInfoD(document.body) as ITPSInfo;
            }
        });
    });
}

