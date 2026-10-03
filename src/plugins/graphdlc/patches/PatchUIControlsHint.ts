import type { PlayerAccess } from '@logic-arrows/player/player-access';
import type { UIControlsHint } from '@logic-arrows/ui/components/ui-controls-hint';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { ControlsState, KeyBindHint } from 'src/plugins/core/Plugin';
import type { IPatcher } from '../../Patcher';

const replaceInlineKeys = (match: string): string => {
    match = match.replace('#', '').replace('(', '').replace(')', '');
    return `<span class="inline-key-blue">${match}</span>`;
};

const inlineKeysRegex: RegExp = /(#(\w+))|(#\(.+?\))/gm;

function inlineKeys(rawText: string): string {
    return rawText.replace(inlineKeysRegex, replaceInlineKeys);
}

function isHintVisible(keybindHint: KeyBindHint): boolean {
    if (!keybindHint.triggers) return true;
    return keybindHint.triggers.every((trigger) => trigger.value);
}

function filterByState(
    state: ControlsState,
    keybindHints: KeyBindHint[],
): KeyBindHint[] {
    return keybindHints.filter(
        (keybindHint) =>
            keybindHint.showOn.includes(state) && isHintVisible(keybindHint),
    );
}

function makeHints(keybindHints: KeyBindHint[]): string {
    const rawHints = keybindHints
        .map((hint) => {
            const keys = hint.keys
                .map((key) => {
                    if (typeof key === 'string') {
                        return key;
                    }

                    return key.get();
                })
                .join(' + ');

            return `<p>#(${keys}) ${hint.description.get()}</p>`;
        })
        .join('');

    return inlineKeys(rawHints);
}

export const PatchUIControlsHint: IPatcher = (
    patchLoader: PatchLoader,
    graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'UIControlsHint',
        (_module: typeof UIControlsHint) => {
            const keybindHints = graphDLC.pluginManager.gatherKeybindHints();

            let controlsHint: UIControlsHint | null = null;

            keybindHints.forEach((keybindHint) => {
                keybindHint.triggers?.forEach((trigger) => {
                    trigger.add(() => {
                        // @ts-expect-error
                        controlsHint?.setState(controlsHint?.state);
                    });
                });
            });

            return class UIControlsHint extends _module {
                public constructor(parent: HTMLElement, rights: PlayerAccess) {
                    super(parent, rights);

                    controlsHint = this;
                }

                public updateRights(rights: PlayerAccess): void {
                    super.updateRights(rights);
                    // @ts-expect-error
                    if (!this.rights.canOpenMenu) return;
                    // @ts-expect-error
                    this.hint.innerHTML += makeHints(
                        // @ts-expect-error
                        filterByState(this.state, keybindHints),
                    );
                }

                public setState(
                    state: 'none' | 'free' | 'arrow' | 'selected',
                ): void {
                    // @ts-expect-error
                    if (this.state === state) return;
                    super.setState(state);
                    // @ts-expect-error
                    if (!this.rights.canOpenMenu) return;
                    // @ts-expect-error
                    this.hint.innerHTML += makeHints(
                        // @ts-expect-error
                        filterByState(this.state, keybindHints),
                    );
                }
            };
        },
    );
};
