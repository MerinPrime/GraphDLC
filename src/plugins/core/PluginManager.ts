import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { STORAGE_KEYS } from 'src/core/StorageKeys';
import { DeveloperModeSetting } from 'src/core/settings/instances/developer/DeveloperModeSetting';
import type { BaseSetting } from 'src/core/settings/types/BaseSetting';
import { ApplyPatches } from '../Patcher';
import { PluginsPlugin } from '../plugins';
import type { KeyBindHint, Plugin } from './Plugin';
import { PluginRegistry } from './PluginRegistry';

export class PluginManager {
    private readonly registry: Plugin[];

    public constructor(registry: Plugin[] = PluginRegistry) {
        this.registry = registry;
    }

    public setup(): void {
        this.load();

        for (const plugin of this.registry) {
            plugin.enabled.add((enabled) => {
                if (enabled) {
                    this.resolveDependencies(plugin);
                } else {
                    this.disableDependents(plugin);
                }
                this.save();
            });
        }

        DeveloperModeSetting.onChange.add((newValue) => {
            PluginsPlugin.enabled.value = newValue;
            if (!PluginsPlugin.enabled.value) {
                // TIP: Disable dev only plugins
            }
        });
    }

    public getEnabledPlugins(ignoreEnableSetting: boolean = false): Plugin[] {
        return this.getAllPlugins().filter(
            (plugin) =>
                plugin.isEnabled &&
                ((plugin.features.enableSetting?.value ?? true) ||
                    ignoreEnableSetting),
        );
    }

    public injectPlugins(graphDLC: GraphDLC, patchLoader: PatchLoader) {
        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.features.patches) {
                ApplyPatches(patchLoader, graphDLC, plugin.features.patches);
            }
        }
    }

    public getPlugin(id: string): Plugin | undefined {
        return this.registry.find((plugin) => plugin.id === id);
    }

    public isEnabled(id: string): boolean {
        return this.getPlugin(id)?.enabled.value ?? false;
    }

    public load(): void {
        try {
            const rawData = localStorage.getItem(STORAGE_KEYS.Plugins);
            if (!rawData) return;

            const parsed = JSON.parse(rawData) as Record<string, boolean>;

            for (const plugin of this.registry) {
                if (plugin.id in parsed) {
                    plugin.enabled.value = parsed[plugin.id];
                }
            }
        } catch (error) {
            console.error(
                `[PluginManager] Failed to load plugin states from ${STORAGE_KEYS.Plugins}:`,
                error,
            );
        }
    }

    public save(): void {
        try {
            const dataToSave: Record<string, boolean> = {};
            for (const plugin of this.registry) {
                dataToSave[plugin.id] = plugin.enabled.value;
            }

            localStorage.setItem(
                STORAGE_KEYS.Plugins,
                JSON.stringify(dataToSave),
            );
        } catch (error) {
            console.error(
                `[PluginManager] Failed to save plugin states to ${STORAGE_KEYS.Plugins}:`,
                error,
            );
        }
    }

    private resolveDependencies(plugin: Plugin): void {
        if (!plugin.meta.dependencies || plugin.meta.dependencies.length === 0)
            return;

        for (const depPlugin of plugin.meta.dependencies) {
            if (depPlugin && !depPlugin.enabled.value) {
                depPlugin.enabled.value = true;
            }
        }
    }

    private disableDependents(plugin: Plugin): void {
        for (const otherPlugin of this.registry) {
            if (
                otherPlugin.enabled.value &&
                otherPlugin.meta.dependencies?.includes(plugin)
            ) {
                otherPlugin.enabled.value = false;
            }
        }
    }

    public getAllPlugins(): Plugin[] {
        const visited = new Set<string>();
        const result: Plugin[] = [];

        const visit = (plugin: Plugin) => {
            if (visited.has(plugin.id)) return;

            if (
                plugin.meta.dependencies &&
                plugin.meta.dependencies.length > 0
            ) {
                const sortedDeps = [...plugin.meta.dependencies].sort(
                    (a, b) => (b.meta.priority ?? 0) - (a.meta.priority ?? 0),
                );

                for (const dep of sortedDeps) {
                    if (dep) visit(dep);
                }
            }

            visited.add(plugin.id);
            result.push(plugin);
        };

        const sortedRegistry = [...this.registry].sort(
            (a, b) => (b.meta.priority ?? 0) - (a.meta.priority ?? 0),
        );

        for (const plugin of sortedRegistry) {
            visit(plugin);
        }

        return result;
    }

    public gatherSettings(): Record<string, BaseSetting<any>> {
        const gathered: BaseSetting<any>[] = [];

        for (const plugin of this.getEnabledPlugins(true)) {
            if (plugin.features.settings)
                gathered.push(...plugin.features.settings);
            if (plugin.features.enableSetting)
                gathered.push(plugin.features.enableSetting);
        }

        return gathered.reduce<Record<string, BaseSetting<any>>>(
            (registry, setting) => {
                const registryKey =
                    setting.key.charAt(0).toLowerCase() + setting.key.slice(1);

                registry[registryKey] = setting;
                return registry;
            },
            {},
        );
    }

    public gatherKeybindHints(): KeyBindHint[] {
        const gathered: KeyBindHint[] = [];

        for (const plugin of this.getEnabledPlugins()) {
            if (plugin.features.keyBindHints)
                gathered.push(...plugin.features.keyBindHints);
        }

        return gathered;
    }
}
