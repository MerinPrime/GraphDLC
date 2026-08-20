import { Page } from '@logic-arrows/pages/page';
import type { PluginManager } from '../../core/PluginManager';
import { PluginApplyChangesText } from './Locale';
import { UIPluginItem } from './UIPluginItem';

export class PluginsPage extends Page {
    private manager: PluginManager;
    private listContainer: HTMLDivElement;
    private applyButton!: HTMLButtonElement;

    private pendingEnabledIds: Set<string>;

    public constructor(manager: PluginManager, parent?: HTMLElement) {
        super(parent);
        this.manager = manager;

        this.pendingEnabledIds = new Set(
            this.manager
                .getAllPlugins()
                .filter((p) => p.enabled.value)
                .map((p) => p.id),
        );

        this.buildHeader();

        this.listContainer = document.createElement('div');
        this.listContainer.className = 'plugins-list';
        this.mainDiv.appendChild(this.listContainer);

        this.renderPlugins();
    }

    public getClass(): string {
        return 'plugins-page';
    }

    private buildHeader(): void {
        const header = document.createElement('div');
        header.className = 'plugins-header';

        // const subtitle = document.createElement('p');
        // subtitle.className = 'text-muted';
        // subtitle.innerText =
        //     'Manage mods and extensions. Applying changes will reload the page.';
        // header.appendChild(subtitle);

        this.mainDiv.appendChild(header);

        this.applyButton = document.createElement('button');
        this.applyButton.className = 'btn btn-primary apply-btn';
        this.applyButton.innerText = PluginApplyChangesText.get();
        this.applyButton.addEventListener('click', () => this.applyChanges());
        this.applyButton.disabled = true;

        this.mainDiv.appendChild(this.applyButton);
    }

    private updateApplyButtonState(): void {
        const initialEnabledIds = new Set(
            this.manager
                .getAllPlugins()
                .filter((p) => p.enabled.value)
                .map((p) => p.id),
        );

        let hasChanges = this.pendingEnabledIds.size !== initialEnabledIds.size;

        if (!hasChanges) {
            for (const id of this.pendingEnabledIds) {
                if (!initialEnabledIds.has(id)) {
                    hasChanges = true;
                    break;
                }
            }
        }

        this.applyButton.disabled = !hasChanges;
    }

    public togglePendingPlugin(pluginId: string, enabled: boolean): void {
        if (enabled) {
            this.pendingEnabledIds.add(pluginId);
        } else {
            this.pendingEnabledIds.delete(pluginId);
            this.disableDependents(pluginId);
        }

        this.updateApplyButtonState();
        this.renderPlugins();
    }

    private disableDependents(disabledPluginId: string): void {
        const plugins = this.manager.getAllPlugins();
        for (const p of plugins) {
            const hasDep = p.meta.dependencies?.some(
                (dep) => dep.id === disabledPluginId,
            );
            if (hasDep) {
                this.pendingEnabledIds.delete(p.id);
                this.disableDependents(p.id);
            }
        }
    }

    private applyChanges(): void {
        const plugins = this.manager.getAllPlugins();

        plugins.forEach((plugin) => {
            const isPending = this.pendingEnabledIds.has(plugin.id);
            plugin.enabled.value = isPending;
        });

        window.location.reload();
    }

    private renderPlugins(): void {
        this.listContainer.innerHTML = '';

        const plugins = this.manager.getAllPlugins();
        if (plugins.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-muted';
            empty.innerText = '???';
            this.listContainer.appendChild(empty);
            return;
        }

        plugins.forEach((plugin) => {
            new UIPluginItem(
                this.listContainer,
                plugin,
                this.pendingEnabledIds,
                (id, state) => this.togglePendingPlugin(id, state),
            );
        });
    }
}
