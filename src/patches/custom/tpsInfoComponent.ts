import {CUIComponent} from "./cuiComponent";
import {GraphDLC} from "../../core/graphdlc";
import {Settings} from "../../core/settings";
import {GameText} from "../../api/gameText";

export class TPSInfoComponent extends CUIComponent {
    private settings: Settings;
    private tpsLocale: string;
    private fpsLocale: string;
    
    private lastUpdate: number;
    private ticks: number;
    private frames: number;
    private tps: number;
    private fps: number;
    
    constructor(graphDLC: GraphDLC, parent: HTMLElement) {
        super(parent);
        
        const GameText = graphDLC.patchLoader.getDefinitionPtr<GameText>("GameText").definition;
        this.tpsLocale = GameText.TPS_LOCALE.get();
        this.fpsLocale = GameText.FPS_LOCALE.get();
        this.settings = graphDLC.settings;
        
        this.lastUpdate = 0;
        this.ticks = 0;
        this.frames = 0;
        this.tps = 0;
        this.fps = 0;

        this.element.classList.add("tps-info");
        this.setVisibility(this.settings.data.showTPSInfo);
        this.updateInfo();
    }
    
    private updateInfo() {
        this.element.innerText = `${this.fpsLocale}: ${Math.round(this.fps)} | ${this.tpsLocale}: ${Math.round(this.tps)}`;
    }
    
    updateTicks(updatedTicks: number) {
        this.ticks += updatedTicks;
        this.frames += 1;
        
        const now = Date.now();
        const delta = now - this.lastUpdate;
        if (delta < this.settings.data.tpsUpdateFrequencyMs) {
            return;
        }
        this.tps = this.ticks / delta * 1000;
        this.fps = this.frames / delta * 1000;
        this.ticks = 0;
        this.frames = 0;
        this.lastUpdate = now;
        this.updateInfo();
    }
}