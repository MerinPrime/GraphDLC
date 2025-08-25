import {DebugMode} from "../graph_compiler/ast/astDebugger";

type SettingsData = {
    tpsUpdateFrequencyMs: number;
    fullRendering: boolean;

    targetFPS: number;
    showTPSInfo: boolean;
    showDebugInfo: boolean;
    
    showArrowConnections: boolean;
    showArrowTarget: boolean;
    
    optimizeRings: boolean;
    optimizeButtons: boolean;
    optimizePixels: boolean;
    optimizeBranches: boolean;
    optimizeSimple: boolean;
    optimizePaths: boolean;
    
    debugMode: DebugMode;
}

export class Settings {
    private static readonly STORAGE_KEY = 'graphdlc';
    
    data: SettingsData;
    
    constructor() {
        this.data = {
            tpsUpdateFrequencyMs: 500,
            fullRendering: false,

            targetFPS: 60,
            showTPSInfo: true,
            showDebugInfo: true,
            
            showArrowConnections: false,
            showArrowTarget: false,
            
            optimizeRings: true,
            optimizeButtons: false,
            optimizePixels: true,
            optimizeBranches: true,
            optimizeSimple: true,
            optimizePaths: true,

            debugMode: DebugMode.NONE,
        }
        this.load();
    }

    load() {
        if (!this.hasData(Settings.STORAGE_KEY))
            this.save();

        const data = this.getData<Partial<SettingsData>>(Settings.STORAGE_KEY, {});
        this.data = { ...this.data, ...data };
    }

    save() {
        this.setData<SettingsData>(Settings.STORAGE_KEY, this.data);
    }

    hasData(key: string): boolean {
        return localStorage.getItem(key) !== null;
    }

    getData<T>(key: string, defaultValue: T): T {
        const value = localStorage.getItem(key);
        return value !== null ? JSON.parse(value) : defaultValue!;
    }

    setData<T>(key: string, value: T) {
        localStorage.setItem(key, JSON.stringify(value));
    }
}
