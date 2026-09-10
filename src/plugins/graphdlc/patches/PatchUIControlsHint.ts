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

            let updateHints: (() => void) | null = null;

            keybindHints.forEach((keybindHint) => {
                keybindHint.triggers?.forEach((trigger) => {
                    trigger.add(() => {
                        updateHints?.();
                    });
                });
            });

            // @ts-expect-error
            return class UIControlsHint extends _module {
                public constructor(parent: HTMLElement, rights: PlayerAccess) {
                    super(parent, rights);

                    updateHints = () => {
                        this.updateHints();
                    };
                }

                public updateHints(): void {
                    // @ts-expect-error
                    if (this.state === 'none') this.hide();
                    // @ts-expect-error
                    else if (this.state === 'free') this.showFreeCursorHint();
                    // @ts-expect-error
                    else if (this.state === 'arrow') this.showArrowCursorHint();
                    // @ts-expect-error
                    else if (this.state === 'selected') this.showSelectedHint();
                }

                public showFreeCursorHint(): void {
                    // @ts-expect-error
                    super.showFreeCursorHint();

                    // @ts-expect-error
                    this.hint.innerHTML += makeHints(
                        filterByState('free', keybindHints),
                    );
                }

                public showArrowCursorHint(): void {
                    // @ts-expect-error
                    super.showArrowCursorHint();

                    // @ts-expect-error
                    this.hint.innerHTML += makeHints(
                        filterByState('arrow', keybindHints),
                    );
                }

                public showSelectedHint(): void {
                    // @ts-expect-error
                    super.showSelectedHint();

                    // @ts-expect-error
                    this.hint.innerHTML += makeHints(
                        filterByState('selected', keybindHints),
                    );
                }
            };
        },
    );
};
