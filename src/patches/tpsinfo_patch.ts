import { LayersDLC } from "../core/layersDLC";

export interface ITPSInfo {
    info: HTMLElement;
    tps: number;
    updatedTicks: number;
    lastUpdate: number;
    
    updateInfo(updatedTicks: number): void;
}

export function PatchTPSInfo(layersDLC: LayersDLC) {
    layersDLC.patchLoader.addDefinitionPatch("UIComponent", function (UIComponent: any): any {
        layersDLC.patchLoader.setDefinition("TPSInfo", class TPSInfo extends UIComponent implements ITPSInfo {
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
                if (delta < layersDLC.settings.data.tpsUpdateFrequencyMs) {
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
