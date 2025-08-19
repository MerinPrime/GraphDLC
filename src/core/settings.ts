export class Settings {
    tpsUpdateFrequencyMs: number = 500;
    doRenderRings: boolean = false;

    optimizeRings: boolean = true;
    optimizePixels: boolean = true;
    optimizeButtons: boolean = false;
    optimizePathes: boolean = true;
    optimizeBranches: boolean = true;
    
    constructor() {
        this.load();
    }

    load() {
        this.tpsUpdateFrequencyMs = this.getData("tpsUpdateFrequencyMs", this.tpsUpdateFrequencyMs);
        this.doRenderRings = this.getData("doRenderRings", this.doRenderRings);

        this.optimizeRings = this.getData("optimizeRings", this.optimizeRings);
        this.optimizePixels = this.getData("optimizePixels", this.optimizePixels);
        this.optimizeButtons = this.getData("optimizeButtons", this.optimizeButtons);
        this.optimizePathes = this.getData("optimizePathes", this.optimizePathes);
        this.optimizeBranches = this.getData("optimizeBranches", this.optimizeBranches);
    }

    save() {
        this.setData("tpsUpdateFrequencyMs", this.tpsUpdateFrequencyMs);
        this.setData("doRenderRings", this.doRenderRings);

        this.setData("optimizeRings", this.optimizeRings);
        this.setData("optimizePixels", this.optimizePixels);
        this.setData("optimizeButtons", this.optimizeButtons);
        this.setData("optimizePathes", this.optimizePathes);
    }

    getData<T>(key: string, defaultValue: T): T {
        const value = localStorage.getItem(key);
        return value !== null ? JSON.parse(value) : defaultValue;
    }

    setData(key: string, value: any) {
        localStorage.setItem(key, JSON.stringify(value));
    }
}
