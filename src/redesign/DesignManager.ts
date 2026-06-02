import { GraphDLCDesignSetting } from 'src/core/settings/instances/redesign/GraphDLCDesignSetting';
import { QoLReDesignSetting } from 'src/core/settings/instances/redesign/QoLReDesignSetting';
import type { BoolSetting } from 'src/core/settings/types/BoolSetting';
import graphDLCStyle from 'src/redesign/default/index.scss?raw';
import qolStyle from 'src/redesign/qol/index.scss?raw';

interface DesignSetting {
    setting: BoolSetting;
    style: string;
}

export class DesignManager {
    private designSettings: DesignSetting[] = [
        {
            setting: QoLReDesignSetting,
            style: qolStyle,
        },
        {
            setting: GraphDLCDesignSetting,
            style: graphDLCStyle,
        },
    ];

    constructor() {
        this.designSettings.forEach(this.applySetting);
    }

    private applySetting({ setting, style }: DesignSetting) {
        const styleElement = document.createElement('style');
        styleElement.textContent = style;

        const appendToHead = () => {
            if (document.head) {
                document.head.appendChild(styleElement);
                return true;
            }

            const observer = new MutationObserver(() => {
                if (document.head) {
                    document.head.appendChild(styleElement);
                    observer.disconnect();
                }
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
            });
            return false;
        };

        if (setting.value) {
            appendToHead();
        }

        setting.onChange.add((newValue) => {
            if (newValue) {
                appendToHead();
            } else {
                styleElement.remove();
            }
        });
    }
}
