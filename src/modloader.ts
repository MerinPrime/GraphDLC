const modules: Record<string, any> = {};
const inst_modules: Record<string, any> = {};
const new_modules: Record<string, any> = {};
const patches: [string, (module: any) => any][] = [];
const new_patches: [string, string, (module: any) => any][] = [];

function patch(moduleName: string, callback: (module: any) => any): void {
    patches.push([moduleName, callback]);
}

function new_patch(moduleName: string, newModuleName: string, callback: (module: any) => any): void {
    new_patches.push([moduleName, newModuleName, callback]);
}

const originalCall = Function.prototype.call;

Function.prototype.call = function (...args: any[]): any {
    // @ts-ignore
    const result = originalCall.apply(this, args);
    const exports = args[2] as Record<string, any> | undefined;

    if (!exports || exports.__esModule !== true)
        return result;

    const exportNames = Object.keys(exports).filter(key => key !== '__esModule');

    exportNames.forEach((exportName) => {
        patches.forEach(([moduleName, callback]) => {
            if (moduleName === exportName) {
                exports[exportName] = callback(exports[exportName]);
            }
        });

        let previousLength: number;
        do {
            previousLength = Object.keys(new_modules).length;

            new_patches.forEach(([moduleName, newModuleName, callback]) => {
                if (moduleName === exportName && !(newModuleName in new_modules)) {
                    new_modules[newModuleName] = callback(exports[exportName]);
                }
                
                if(moduleName in new_modules && !(newModuleName in new_modules)){
                    new_modules[newModuleName] = callback(new_modules[moduleName]);
                }
            });
        } while (Object.keys(new_modules).length > previousLength);

        if (typeof exports[exportName] === 'function' && /^\s*class\s+/.test(exports[exportName].toString())) {
            const originalClass = exports[exportName];
            exports[exportName] = class ModuleProxy extends originalClass {
                constructor(...ctorArgs: any[]) {
                    super(...ctorArgs);
                    inst_modules[exportName] = this;
                }
            };
        }
        modules[exportName] = exports[exportName];
    });
    
    return result;
};

export { patch, new_patch };