export class PatchLoader {
    private definitions: Record<string, any> = {};
    private instances: Record<string, any> = {};
    private patches: Array<(name: string, definition: any) => boolean> = [];
    private originalCall?: (this: Function, thisArg: any, ...argArray: any[]) => any;
    
    constructor() {
        
    }
    
    hook() {
        if (this.originalCall)
            return;

        this.originalCall = Function.prototype.call;
        const modLoader = this;
        Function.prototype.call = function(thisArg: any, ...args: any[]) {
            return modLoader.patchedCall(this, thisArg, ...args);
        };
    }

    private patchedCall(originalFunction: Function, thisArg: any, ...argArray: any[]): any {
        if (!this.originalCall)
            throw new Error("PatchLoader is not hooked");
        console.log(argArray)

        const result = Reflect.apply(originalFunction, thisArg, argArray);
        const exports = argArray[1] as Record<string, any> | undefined;

        if (!exports || exports.__esModule !== true) return result;

        for (const key of Object.keys(exports)) {
            if (key === '__esModule') continue;

            let definition = exports[key];

            if (typeof definition === 'function' && /^class\s/.test(Function.prototype.toString.call(definition))) {
                const modLoader = this;
                const original = definition;
                definition = class extends original {
                    constructor(...ctorArgs: any[]) {
                        super(...ctorArgs);
                        modLoader.setInstance(key, this);
                    }
                };
            }

            this.setDefinition(key, definition);
            exports[key] = this.definitions[key];
        }

        return result;
    }

    public getDefinition(name: string): any {
        return this.definitions[name];
    }

    public setDefinition(name: string, definition: any): void {
        this.definitions[name] = definition;

        const oldPatches = this.patches;
        const newPatches: typeof this.patches = [];
        this.patches = [];
        
        for (const patch of oldPatches) {
            const removePatch = patch(name, definition);
            if (!removePatch)
                newPatches.push(patch);
        }

        this.patches = newPatches;
    }

    public getInstance(name: string): any {
        return this.instances[name];
    }

    public setInstance(name: string, instance: any) {
        this.instances[name] = instance;
    }

    public addManualPatch(patch: (name: string, definition: any) => boolean): void {
        this.patches.push(patch);
    }

    public addDefinitionPatch(target: string, patch: (name: string, definition: any) => void): void {
        this.addManualPatch((name, definition) => {
            if (name !== target)
                return false;
            patch(name, definition);
            return true;
        });
    }
}