import type { UIControlsHint } from '@logic-arrows/ui/components/ui-controls-hint';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { ControlsState, KeyBindHint } from 'src/plugins/core/Plugin';
import type { IPatcher } from '../../Patcher';

const replaceInlineKeys = (match: string) => {
    match = match.replace('#', '').replace('(', '').replace(')', '');
    return `<span class="inline-key-blue">${match}</span>`;
};
const inlineKeysRegex: RegExp = /(#(\w+))|(#\(.+?\))/gm;

function inlineKeys(rawText: string): string {
    return rawText.replace(inlineKeysRegex, replaceInlineKeys);
}

function filterByState(
    state: ControlsState,
    keybindHints: KeyBindHint[],
): KeyBindHint[] {
    return keybindHints.filter((keybindHint) =>
        keybindHint.showOn.includes(state),
    );
}

function makeHints(keybindHints: KeyBindHint[]): string {
    const rawHints = keybindHints
        .map((hint) => {
            const keys = hint.keys
                .map((key) => {
                    if (typeof key === 'string') return key;
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

            const freeHints = filterByState('free', keybindHints);
            const arrowHints = filterByState('arrow', keybindHints);
            const selectedHints = filterByState('selected', keybindHints);

            // @ts-expect-error
            return class UIControlsHint extends _module {
                public showFreeCursorHint(): void {
                    // @ts-expect-error
                    super.showFreeCursorHint();
                    // @ts-expect-error
                    this.hint.innerHTML += makeHints(freeHints);
                }

                public showArrowCursorHint(): void {
                    // @ts-expect-error
                    super.showArrowCursorHint();
                    // @ts-expect-error
                    this.hint.innerHTML += makeHints(arrowHints);
                }

                public showSelectedHint(): void {
                    // @ts-expect-error
                    super.showSelectedHint();
                    // @ts-expect-error
                    this.hint.innerHTML += makeHints(selectedHints);
                }
            };
        },
    );
};
