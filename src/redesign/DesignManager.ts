import { DarkThemeSetting } from 'src/core/settings/instances/redesign/DarkThemeSetting';
import { GraphDLCDesignSetting } from 'src/core/settings/instances/redesign/GraphDLCDesignSetting';
import { QoLReDesignSetting } from 'src/core/settings/instances/redesign/QoLReDesignSetting';
import type { BoolSetting } from 'src/core/settings/types/BoolSetting';
import darkStyle from 'src/redesign/dark/index.scss?raw';
import graphDLCStyle from 'src/redesign/default/index.scss?raw';
import qolStyle from 'src/redesign/qol/index.scss?raw';

interface DesignSetting {
    setting: BoolSetting;
    style: string;
}

export class DesignManager {
    private designSettings: DesignSetting[] = [
        {
            setting: GraphDLCDesignSetting,
            style: graphDLCStyle,
        },
        {
            setting: DarkThemeSetting,
            style: darkStyle,
        },
        {
            setting: QoLReDesignSetting, // TIP: more priority
            style: qolStyle,
        },
    ];

    public setup() {
        this.waitForElement('documentElement', () => {
            this.designSettings.forEach(this.applySetting.bind(this));

            DarkThemeSetting.onChange.add(() => {
                window.location.reload();
            });

            const syncSrcToCustomProperty = (img: HTMLImageElement) => {
                if (img.src) {
                    img.style.setProperty('--icon-url', `url('${img.src}')`);
                }
            };

            const processNewNodes = (nodes: NodeList) => {
                nodes.forEach((node) => {
                    if (node instanceof HTMLImageElement) {
                        syncSrcToCustomProperty(node);
                    } else if (node instanceof Element) {
                        node.querySelectorAll('img').forEach(
                            syncSrcToCustomProperty,
                        );
                    }
                });
            };

            document.querySelectorAll('img').forEach(syncSrcToCustomProperty);

            const observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (
                        mutation.type === 'attributes' &&
                        mutation.attributeName === 'src'
                    ) {
                        if (mutation.target instanceof HTMLImageElement) {
                            syncSrcToCustomProperty(mutation.target);
                        }
                    } else if (
                        mutation.type === 'childList' &&
                        mutation.addedNodes.length > 0
                    ) {
                        processNewNodes(mutation.addedNodes);
                    }
                }
            });

            observer.observe(document.documentElement, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['src'],
            });
        });
    }

    private applySetting({ setting, style }: DesignSetting) {
        const styleElement = document.createElement('style');
        styleElement.textContent = style;

        const appendToHead = () => {
            this.waitForElement('head', () => {
                document.head.appendChild(styleElement);
            });
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

    private waitForElement(
        selector: 'documentElement' | 'head',
        callback: () => void,
    ) {
        if (document[selector]) {
            callback();
            return;
        }

        const observer = new MutationObserver((_, obs) => {
            if (document[selector]) {
                obs.disconnect();
                callback();
            }
        });

        observer.observe(document, { childList: true, subtree: true });
    }
}
