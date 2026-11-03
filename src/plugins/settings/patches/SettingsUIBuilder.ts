import { PLATFORM } from '@logic-arrows/utils/platform';
import { DeveloperModeSetting } from 'src/core/settings/instances/developer/DeveloperModeSetting';
import type { SortedSettingGroup } from 'src/core/settings/Manager';
import { TextColor } from 'src/core/utils/TextColor';

export interface TextNodeHandle {
    element: HTMLDivElement;
    update: (newText: string, newColor?: TextColor) => void;
}

export interface SettingOptions {
    label: string;
    controlFactory: () => HTMLElement;
    description?: string | null;
    labelColor?: TextColor;
    descriptionColor?: TextColor;
    hideDescriptionOnMobile?: boolean;
}

export class SettingsUIBuilder {
    private insert: (element: HTMLElement) => void;

    private constructor(inserter: (element: HTMLElement) => void) {
        this.insert = inserter;
    }

    public static forContainer(container: HTMLElement): SettingsUIBuilder {
        return new SettingsUIBuilder((el) => container.appendChild(el));
    }

    public static afterElement(anchor: HTMLElement): SettingsUIBuilder {
        let current = anchor;
        return new SettingsUIBuilder((el) => {
            current.after(el);
            current = el;
        });
    }

    public addSpace(size: number = 1): HTMLElement {
        const space = document.createElement('div');
        space.style.height = `${size}vh`;
        this.insert(space);
        return space;
    }

    public addText(
        label: string,
        labelColor: TextColor = TextColor.PRIMARY,
    ): TextNodeHandle {
        const labelText = document.createElement('div');
        labelText.innerHTML = label;
        labelText.classList.add(labelColor);
        this.insert(labelText);

        return {
            element: labelText,
            update: (newText: string, newColor: TextColor = labelColor) => {
                labelText.classList.remove(labelColor);
                labelText.innerHTML = newText;
                labelText.classList.add(newColor);
                labelColor = newColor;
            },
        };
    }

    public addSetting(options: SettingOptions): HTMLTableRowElement {
        const {
            label,
            controlFactory,
            description = null,
            labelColor = TextColor.PRIMARY,
            descriptionColor = TextColor.MUTED,
            hideDescriptionOnMobile = false,
        } = options;

        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        nameCell.classList.add('setting-name');

        const labelText = document.createElement('div');
        labelText.innerText = `${label}:`;
        labelText.classList.add(labelColor);
        nameCell.appendChild(labelText);

        const shouldShowDescription =
            description && (!hideDescriptionOnMobile || PLATFORM !== 'mobile');

        if (shouldShowDescription) {
            const descText = document.createElement('div');
            descText.classList.add('setting-description');
            descText.innerText = description;
            descText.classList.add(descriptionColor);
            nameCell.appendChild(descText);
        }

        row.appendChild(nameCell);

        const valueCell = document.createElement('td');
        valueCell.classList.add('setting-value');
        valueCell.appendChild(controlFactory());
        row.appendChild(valueCell);

        this.insert(row);
        return row;
    }

    public addGroup(
        group: SortedSettingGroup,
        hideDescriptionOnMobile = false,
        collapsible = true,
    ): void {
        this.addSpace(2);

        const name = group.group.text.get();
        const label = DeveloperModeSetting.value
            ? `${group.group.order}. ${name}`
            : name;

        const isCollapsible = collapsible && group.group.collapsible === true;

        let isCollapsed =
            isCollapsible && Boolean(group.group.collapsedByDefault);

        const header = document.createElement('div');
        header.className = `${isCollapsible ? 'setting-group-header ' : ''}${group.group.color ?? TextColor.PRIMARY}`;
        header.innerHTML = isCollapsible
            ? `
            <svg class="setting-group-arrow" viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2.5 3.75 L5 6.25 L7.5 3.75"/>
            </svg>
            <span>${label}</span>
        `
            : label;
        this.insert(header);

        const content: HTMLElement[] = [];
        group.settings.forEach((setting) => {
            const settingName = setting.meta.name.get();
            const settingLabel = DeveloperModeSetting.value
                ? `${setting.meta.order}. ${settingName}`
                : settingName;
            content.push(
                this.addSpace(0.5),
                this.addSetting({
                    label: settingLabel,
                    controlFactory: () => setting.buildUIComponent(),
                    description: setting.meta.description?.get(),
                    labelColor: setting.meta.nameColor,
                    descriptionColor: setting.meta.descriptionColor,
                    hideDescriptionOnMobile,
                }),
            );
        });

        if (isCollapsible) {
            const updateState = () => {
                header.classList.toggle('collapsed', isCollapsed);
                for (const el of content) {
                    el.style.display = isCollapsed ? 'none' : '';
                }
            };

            header.onclick = () => {
                isCollapsed = !isCollapsed;
                updateState();
            };

            if (isCollapsed) {
                updateState();
            }
        }
    }

    public addGroups(
        groups: SortedSettingGroup[],
        hideDescriptionOnMobile = false,
        collapsible = true,
    ): void {
        groups.forEach((group) => {
            this.addGroup(group, hideDescriptionOnMobile, collapsible);
        });
    }
}
