import { PLATFORM } from '@logic-arrows/utils/platform';
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
    ): void {
        this.addSpace(2);
        this.addText(group.group.text.get(), group.group.color);
        group.settings.forEach((setting) => {
            this.addSpace(0.5);
            this.addSetting({
                label: setting.meta.name.get(),
                controlFactory: () => setting.buildUIComponent(),
                description: setting.meta.description?.get(),
                labelColor: setting.meta.nameColor,
                descriptionColor: setting.meta.descriptionColor,
                hideDescriptionOnMobile,
            });
        });
    }

    public addGroups(
        groups: SortedSettingGroup[],
        hideDescriptionOnMobile = false,
    ): void {
        groups.forEach((group) => {
            this.addGroup(group, hideDescriptionOnMobile);
        });
    }
}
