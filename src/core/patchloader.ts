export interface DefinitionPtr<T> {
    definition: T;
}

export class PatchLoader {
    private definitionPtrs: Map<string, DefinitionPtr<any>>;
    private instances: Map<string, any>;
    private patches: Array<(name: string, definition: any) => boolean>;
    private originalCall?: (this: Function, thisArg: any, ...argArray: any[]) => any;
    
    constructor() {
        this.definitionPtrs = new Map();
        this.instances = new Map();
        this.patches = [];
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
            exports[key] = this.getDefinitionPtr<any>(key).definition;
        }

        return result;
    }

    public getDefinitionPtr<T>(name: string): DefinitionPtr<T> {
        if (!this.definitionPtrs.has(name)) {
            this.definitionPtrs.set(name, { definition: undefined });
        }
        return this.definitionPtrs.get(name) as DefinitionPtr<T>;
    }

    public setDefinition<T>(name: string, definition: T): void {
        if (!this.definitionPtrs.has(name)) {
            this.definitionPtrs.set(name, { definition: undefined });
        }
        this.definitionPtrs.get(name)!.definition = definition;
        
        const oldPatches = this.patches;
        const newPatches: typeof this.patches = [];
        this.patches = [];
        
        for (const patch of oldPatches) {
            const removePatch = patch(name, this.definitionPtrs.get(name)!.definition);
            if (!removePatch)
                newPatches.push(patch);
        }

        this.patches = newPatches;
    }

    public getInstance<T>(name: string): T {
        return this.instances.get(name) as T;
    }

    public setInstance(name: string, instance: any) {
        this.instances.set(name, instance);
    }

    public addManualPatch(patch: (name: string, definition: any) => boolean): void {
        this.patches.push(patch);
    }

    public addDefinitionPatch(target: string, patch: (definition: any) => void): void {
        this.addManualPatch((name, definition) => {
            if (name !== target)
                return false;
            patch(definition);
            return true;
        });
    }
}
