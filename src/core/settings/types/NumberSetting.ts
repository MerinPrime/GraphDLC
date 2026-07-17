import { BaseSetting } from './BaseSetting';
import type { SettingMeta } from './Types';

export interface NumberSettingOptions {
    min: number;
    max: number;
    step?: number;
    formatLabel?: (value: number) => string;
}

export class NumberSetting extends BaseSetting<number> {
    public readonly min: number;
    public readonly max: number;
    public readonly step: number;
    private readonly formatLabel: (value: number) => string;

    public constructor(
        key: string,
        defaultValue: boolean | number,
        meta: SettingMeta,
        options: NumberSettingOptions,
    ) {
        super(
            key,
            typeof defaultValue === 'boolean'
                ? defaultValue
                    ? 1
                    : 0
                : defaultValue,
            meta,
        );

        this.min = options.min;
        this.max = options.max;
        this.step = options.step ?? 1;
        this.formatLabel = options.formatLabel ?? ((value) => value.toString());
    }

    public override validate(newValue: number): boolean {
        return newValue >= this.min && newValue <= this.max;
    }

    public buildUIComponent(): HTMLDivElement {
        const container = document.createElement('div');
        const slider = document.createElement('input');
        const label = document.createElement('span');

        slider.type = 'range';
        slider.min = this.min.toString();
        slider.max = this.max.toString();
        slider.step = this.step.toString();
        slider.value = this.value.toString();
        slider.style.display = 'inline';

        slider.addEventListener('input', () => {
            const val = parseInt(slider.value, 10);
            this.value = val;
            label.innerText = this.formatLabel(this.value);
        });

        label.innerText = this.formatLabel(this.value);

        container.appendChild(slider);
        container.appendChild(label);

        return container;
    }
}
