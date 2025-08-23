import { LayersDLC } from "../core/layersDLC";
import { ITPSInfo } from "./tpsinfo_patch";

export function PatchPlayerUI(layersDLC: LayersDLC) {
    layersDLC.patchLoader.addDefinitionPatch("PlayerUI", function (module: any): any {
        layersDLC.patchLoader.setDefinition("PlayerUI", class PlayerUI extends module {
            addSpeedController() {
                const UIRange = layersDLC.patchLoader.getDefinition<any>('UIRange');
                const TPSInfoD = layersDLC.patchLoader.getDefinition<any>('TPSInfo');

                this.speedController = new UIRange(document.body, 9, (e: number) => {
                    return ['3', '12', '60', '300', '1200', '6000', '30000', '120000', 'MAX'][e] + ' TPS';
                });
                layersDLC.tpsInfo = new TPSInfoD(document.body) as ITPSInfo;
            }
        });
    });
}

