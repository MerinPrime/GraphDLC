import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';
import { CustomTPSComponent } from './CustomTPSComponent';

type CallbackType = (value: number) => string;

export const PatchSpeedController: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('UISpeedController', (_module: any) => {
        return class UISpeedController extends _module {
            public hasPause: boolean = false;
            public customTPSField: CustomTPSComponent | null = null;

            public constructor(
                parent: HTMLElement,
                maxValue: number,
                hasPause: boolean,
                onMessage: CallbackType = () => '',
                onThumb: CallbackType = () => '',
            ) {
                super(parent, maxValue, hasPause, onMessage, onThumb);
                this.hasPause = hasPause;
                this.customTPSField = new CustomTPSComponent(
                    this.element,
                    hasPause,
                );
                this.setValue(this.getValue() + 1);
            }

            public setValue(value: number): void {
                super.setValue(value);
                const normValue = Math.max(
                    0,
                    Math.min((this as any).maxValue, Math.round(value)),
                );
                if (this.hasPause)
                    this.customTPSField?.setVisibility(normValue === 1);
                else this.customTPSField?.setVisibility(normValue === 0);
            }

            public elementClick(e: MouseEvent): void {
                // WARN: _module marked as any for elementClick patching
                if (
                    e.target === this.customTPSField?.element ||
                    e.target === this.customTPSField?.field
                )
                    return;
                super.elementClick(e);
            }
        };
    });
};
