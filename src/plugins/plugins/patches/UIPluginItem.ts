import { UIComponent } from '@logic-arrows/ui/components/ui-component';
import type { Plugin } from '../../core/Plugin';
import {
    PluginDepDisabledText,
    PluginDependenciesText,
    PluginDepSatisfiedText,
} from './Locale';

export class UIPluginItem extends UIComponent {
    private plugin: Plugin;
    private pendingEnabledIds: Set<string>;
    private onToggle: (pluginId: string, enabled: boolean) => void;

    private checkbox!: HTMLInputElement;

    public constructor(
        parent: HTMLElement,
        plugin: Plugin,
        pendingEnabledIds: Set<string>,
        onToggle: (pluginId: string, enabled: boolean) => void,
    ) {
        super(parent);
        this.plugin = plugin;
        this.pendingEnabledIds = pendingEnabledIds;
        this.onToggle = onToggle;

        this.buildUI();
    }

    public getClass(): string {
        return 'ui-plugin-item';
    }

    private buildUI(): void {
        const infoCol = document.createElement('div');
        infoCol.className = 'plugin-info-col';

        const titleRow = document.createElement('div');
        titleRow.className = 'plugin-title-row';

        const nameEl = document.createElement('span');
        nameEl.className = 'plugin-name text-primary';
        nameEl.innerText = this.plugin.meta.name;
        titleRow.appendChild(nameEl);

        infoCol.appendChild(titleRow);

        if (this.plugin.meta.description) {
            const descEl = document.createElement('div');
            descEl.className = 'plugin-description text-muted';
            descEl.innerText = this.plugin.meta.description;
            infoCol.appendChild(descEl);
        }

        let isAnyDependencyMissing = false;

        if (
            this.plugin.meta.dependencies &&
            this.plugin.meta.dependencies.length > 0
        ) {
            const depsContainer = document.createElement('div');
            depsContainer.className = 'plugin-deps-container';

            const depLabel = document.createElement('span');
            depLabel.className = 'plugin-deps-label text-muted';
            depLabel.innerText = `${PluginDependenciesText.get()}: `;
            depsContainer.appendChild(depLabel);

            const deps = this.plugin.meta.dependencies;

            deps.forEach((depPlugin, index) => {
                const badge = document.createElement('span');
                badge.className = 'plugin-dep-badge';

                const isSatisfied = this.pendingEnabledIds.has(depPlugin.id);
                if (!isSatisfied) {
                    isAnyDependencyMissing = true;
                }

                badge.classList.add(isSatisfied ? 'text-green' : 'text-red');

                badge.innerText = depPlugin.meta.name;

                badge.title = isSatisfied
                    ? PluginDepSatisfiedText.get()
                    : PluginDepDisabledText.get();

                depsContainer.appendChild(badge);

                const isLast = index === deps.length - 1;
                if (!isLast) {
                    const delimeter = document.createElement('span');
                    delimeter.className = 'text-muted';
                    delimeter.innerText = ', ';
                    depsContainer.appendChild(delimeter);
                }
            });

            infoCol.appendChild(depsContainer);
        }

        this.element.appendChild(infoCol);

        const actionCol = document.createElement('div');
        actionCol.className = 'plugin-action-col setting-value';

        this.checkbox = document.createElement('input');
        this.checkbox.type = 'checkbox';

        const isChecked = this.pendingEnabledIds.has(this.plugin.id);
        this.checkbox.checked = isChecked;

        if (isAnyDependencyMissing || this.plugin.meta.disabled) {
            this.checkbox.disabled = true;
            this.checkbox.title = 'Required dependencies are disabled';
        }

        this.checkbox.addEventListener('change', () => {
            this.onToggle(this.plugin.id, this.checkbox.checked);
        });

        actionCol.appendChild(this.checkbox);
        this.element.appendChild(actionCol);
    }
}
