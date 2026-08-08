export interface ObjectPtr<T> {
    val: T;
}

export class PatchLoader {
    private definitions: Map<string, ObjectPtr<any>>;
    private instances: Map<string, ObjectPtr<any>>;
    private patches: Array<
        (name: string, definition: any) => boolean | Function
    >;

    public constructor() {
        this.definitions = new Map();
        this.instances = new Map();
        this.patches = [];
    }

    public hook(): void {
        window.patchWebpackModules = (
            modules: Record<string | number, Function>,
        ) => {
            console.log(
                `[PatchLoader] Found ${Object.keys(modules).length} modules`,
            );
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
            const isObject = typeof definition !== 'function';

            const modLoader = this;
            const original = definition;
            let patchedTarget: any;

            if (!isObject) {
                const isClass =
                    /^class\s/.test(
                        Function.prototype.toString.call(definition),
                    ) ||
                    /^class\{/.test(
                        Function.prototype.toString
                            .call(definition)
                            .replace(/\s/g, ''),
                    );

                if (isClass) {
                    patchedTarget = class extends original {
                        public constructor(...ctorArgs: any[]) {
                            super(...ctorArgs);
                            modLoader.setInstance(key, this);
                        }
                    };
                    Object.assign(patchedTarget, original);
                } else {
                    patchedTarget = original;
                }
            } else {
                patchedTarget = original;
            }

            patchedTarget = this.runPatches(key, patchedTarget);

            this.setDefinition(key, patchedTarget);
            exports[key] = patchedTarget;
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

    public getDefinition<T = any>(name: string): ObjectPtr<T> {
        if (!this.hasDefinition(name)) {
            this.definitions.set(name, { val: null });
        }
        return this.definitions.get(name) as ObjectPtr<T>;
    }

    public setDefinition<T = any>(name: string, value: T) {
        const definition = this.definitions.get(name);
        if (!definition) {
            this.definitions.set(name, { val: value });
            return;
        }
        definition.val = value;
    }

    public hasDefinition(name: string): boolean {
        return this.definitions.has(name);
    }

    public getInstance<T = any>(name: string): ObjectPtr<T | null> {
        if (!this.hasInstance(name)) {
            this.instances.set(name, { val: null });
        }
        return this.instances.get(name) as ObjectPtr<T | null>;
    }

    public setInstance(name: string, value: any): void {
        const instance = this.instances.get(name);
        if (!instance) {
            this.instances.set(name, { val: value });
            return;
        }
        instance.val = value;
    }

    public hasInstance(name: string): boolean {
        return this.instances.has(name);
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

function getScriptUrl(element: HTMLElement): string | null {
    if (element instanceof HTMLScriptElement && element.src) return element.src;
    if (element instanceof HTMLLinkElement && element.href) return element.href;
    return null;
}

function handleScriptInjection(element: HTMLElement): boolean {
    const url = getScriptUrl(element);

    if (!url?.includes('bundle.js') || url?.includes('bundle-shell.js')) {
        return false;
    }

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
            patchedScript.textContent = `${patchedCode}\n//# sourceURL=${url.split('?')[0]}`;

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
