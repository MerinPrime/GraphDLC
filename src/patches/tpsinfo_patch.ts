import { LayersDLC } from "../core/layersdlc";

export interface ITPSInfo {
    info: HTMLElement;
    tps: number;
    updatedTicks: number;
    lastUpdate: number;
    
    updateInfo(updatedTicks: number): void;
}

export function PatchTPSInfo(layersdlc: LayersDLC) {
    layersdlc.patchLoader.addDefinitionPatch("UIComponent", function (UIComponent: any): any {
        layersdlc.patchLoader.setDefinition("TPSInfo", class TPSInfo extends UIComponent implements ITPSInfo {
            info: HTMLElement;
            tps: number;
            updatedTicks: number;
            lastUpdate: number;

            constructor(element: HTMLElement) {
                super(element);
                this.tps = 0;
                this.updatedTicks = 0;
                this.lastUpdate = 0;
                this.info = document.createElement("div");
                this.info.innerText = "TPS: 0";
                this.element!.appendChild(this.info);
            }

            updateInfo(updatedTicks: number) {
                this.updatedTicks += updatedTicks;
                const now = Date.now();
                const delta = now - this.lastUpdate;
                if (delta < layersdlc.settings.tpsUpdateFrequencyMs) {
                    return;
                }
                this.tps = this.updatedTicks / delta * 1000;
                this.updatedTicks = 0;
                this.lastUpdate = now;
                this.info.innerText = `TPS: ${Math.round(this.tps)}`;
            }

            getClass() {
                return "cuicomponent tps-info"
            }
        });
    });
}
