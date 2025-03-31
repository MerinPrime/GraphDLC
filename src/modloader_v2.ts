const ModLoaderV2 = new class ModLoaderV2 {
    private definitions: Record<string, any> = {};
    private instances: Record<string, any> = {};
    private patches: Array<(name: string, definition: any) => boolean> = [];
    private originalCall: (this: Function, thisArg: any, ...argArray: any[]) => any;

    constructor() {
        this.originalCall = Function.prototype.call;
        const modLoader = this;
        Function.prototype.call = function (...args: any[]) {
            // @ts-ignore
            return modLoader.patchedCall(this, ...args);
        };
    }

    patchedCall(originalFunction: Function, ...args: any[]): any {
        const modLoader = this;
        // @ts-ignore
        const result = modLoader.originalCall.apply(originalFunction, args);
        const exports = args[2] as Record<string, any> | undefined;
        
        if (!exports || exports.__esModule !== true)
            return result;

        const exportDefinitions = Object
            .keys(exports)
            .filter(key => key !== '__esModule');

        exportDefinitions.forEach((definitionName) => {
            let definition: any = exports[definitionName];

            if (typeof definition === 'function' && /^\s*class\s+/.test(definition.toString())) {
                definition = class ModuleProxy extends definition {
                    constructor(...ctorArgs: any[]) {
                        super(...ctorArgs);
                        modLoader.setInstance(definitionName, this);
                    }
                };
            }
            modLoader.setDefinition(definitionName, definition);
            exports[definitionName] = modLoader.definitions[definitionName];
        })

        return result;
    };

    public setDefinition(name: string, definition: any) {
        this.definitions[name] = definition;

        for (let i = 0; i < this.patches.length; i++) {
            const tempPatch = this.patches.splice(0, 1)[0];
            const isApplied = tempPatch(name, definition);
            if (isApplied)
                continue;
            this.patches.push(tempPatch);
        }
    }

    public getDefinition(name: string): any {
        return this.definitions[name];
    }

    public setInstance(name: string, instance: any) {
        this.instances[name] = instance;
    }

    public getInstance(name: string): any {
        return this.instances[name];
    }

    public addManualPatch(patch: (name: string, definition: any) => boolean) {
        this.patches.push(patch);
    }

    public addDefinitionPatch(target: string, patch: (name: string, definition: any) => any) {
        function tempPatch(name: string, definition: any) {
            if (name !== target)
                return false;
            patch(name, definition);
            return true;
        }
        this.addManualPatch(tempPatch);
    }
}

/*

Bundle.ModifyModule("ArrowShader").ModifyFunction("makeFragmentShader");

 */

export { ModLoaderV2 }