declare global {
    interface Window {
        patchWebpackModules: (modules: Record<string | number, Function>) => {};
    }
}

export class PatchLoader {
    private definitions: Map<string, any>;
    private instances: Map<string, any>;
    private patches: Array<
        (name: string, definition: any) => boolean | Function
    >;

    constructor() {
        this.definitions = new Map();
        this.instances = new Map();
        this.patches = [];
    }

    public hook(): void {
        window.patchWebpackModules = (
            modules: Record<string | number, Function>,
        ) => {
            console.log(modules);
            for (const id of Object.keys(modules)) {
                const originalFn = modules[id];

                modules[id] = (module: any, exports: any, require: any) => {
                    const result = originalFn(module, exports, require);
                    const realExports = module.exports || exports;

                    if (realExports && typeof realExports === 'object') {
                        this.processExports(realExports);
                    }

                    return result;
                };
            }
            return modules;
        };
    }

    private processExports(exports: Record<string, any>): void {
        for (const key of Object.keys(exports)) {
            if (key === '__esModule') continue;

            const definition = exports[key];

            if (
                typeof definition === 'function' &&
                (/^class\s/.test(
                    Function.prototype.toString.call(definition),
                ) ||
                    /^class\{/.test(
                        Function.prototype.toString
                            .call(definition)
                            .replace(/\s/g, ''),
                    ))
            ) {
                const modLoader = this;
                const original = definition;

                let patchedClass = class extends original {
                    constructor(...ctorArgs: any[]) {
                        super(...ctorArgs);
                        modLoader.setInstance(key, this);
                    }
                };

                Object.assign(patchedClass, original);

                patchedClass = this.runPatches(key, patchedClass);

                this.definitions.set(key, patchedClass);
                exports[key] = patchedClass;
            }
        }
    }

    private runPatches(name: string, definition: any): any {
        const oldPatches = this.patches;
        const newPatches: typeof this.patches = [];
        this.patches = [];

        let currentDefinition = definition;

        for (const patch of oldPatches) {
            const result = patch(name, currentDefinition);

            if (result === true) {
            } else if (result === false) {
                newPatches.push(patch);
            } else if (typeof result === 'function') {
                currentDefinition = result;
            }
        }

        this.patches = newPatches;
        return currentDefinition;
    }

    public getDefinition<T = any>(name: string): T | undefined {
        return this.definitions.get(name) as T | undefined;
    }

    public hasDefinition(name: string): boolean {
        return this.definitions.has(name);
    }

    public getInstance<T = any>(name: string): T | undefined {
        return this.instances.get(name) as T | undefined;
    }

    public setInstance(name: string, instance: any): void {
        this.instances.set(name, instance);
    }

    public addManualPatch(
        patch: (name: string, definition: any) => boolean | Function,
    ): void {
        this.patches.push(patch);
    }

    public addDefinitionPatch<T = any>(
        target: string,
        patch: (definition: T) => any,
    ): void {
        this.addManualPatch((name, definition) => {
            if (name !== target) return false;

            const patchResult = patch(definition as T);

            if (typeof patchResult === 'function') {
                return patchResult;
            }

            return true;
        });
    }
}

const originalElementAppend = Element.prototype.appendChild;
const originalElementInsertBefore = Element.prototype.insertBefore;
const originalDocAppend = Document.prototype.appendChild;

function handleScriptInjection(element: HTMLElement): boolean {
    let url: string | null = null;

    if (element instanceof HTMLScriptElement && element.src) {
        url = element.src;
    } else if (element instanceof HTMLLinkElement && element.href) {
        url = element.href;
    }

    if (url && url.includes('bundle.js') && !url.includes('bundle-shell.js')) {
        fetch(url)
            .then((res) => res.text())
            .then((gameCode) => {
                const searchStr = 'function s';
                const lastIndex = gameCode.lastIndexOf(searchStr);

                let patchedCode = gameCode;
                if (lastIndex !== -1) {
                    patchedCode =
                        gameCode.slice(0, lastIndex) +
                        '(window.patchWebpackModules(e));' +
                        gameCode.slice(lastIndex);
                } else {
                    console.error(
                        "[GraphDLC] hook pattern 'function s' not found in that bundle.js!",
                    );
                    alert(
                        "[GraphDLC] hook pattern 'function s' not found in that bundle.js!",
                    );
                }

                const patchedScript = document.createElement('script');
                patchedScript.textContent =
                    patchedCode + `\n//# sourceURL=${url.split('?')[0]}`;

                if (element instanceof HTMLScriptElement) {
                    for (let i = 0; i < element.attributes.length; i++) {
                        const attr = element.attributes[i];
                        if (attr.name !== 'src') {
                            patchedScript.setAttribute(attr.name, attr.value);
                        }
                    }
                }

                originalElementAppend.call(document.head, patchedScript);
            })
            .catch((err) => {
                console.error('[GraphDLC] Error fetch-hook bundle.js:', err);
                alert(`[GraphDLC] Error fetch-hook bundle.js: ${err}`);
            });

        return true;
    }

    return false;
}

Element.prototype.appendChild = function <T extends Node>(newChild: T): T {
    if (newChild instanceof HTMLElement) {
        const isIntercepted = handleScriptInjection(newChild);
        if (isIntercepted) return newChild;
    }
    return originalElementAppend.call(this, newChild) as T;
};

Element.prototype.insertBefore = function <T extends Node>(
    newChild: T,
    refChild: Node | null,
): T {
    if (newChild instanceof HTMLElement) {
        const isIntercepted = handleScriptInjection(newChild);
        if (isIntercepted) return newChild;
    }
    return originalElementInsertBefore.call(this, newChild, refChild) as T;
};

Document.prototype.appendChild = function <T extends Node>(newChild: T): T {
    if (newChild instanceof HTMLElement) {
        const isIntercepted = handleScriptInjection(newChild);
        if (isIntercepted) return newChild;
    }
    return originalDocAppend.call(this, newChild) as T;
};
