import type { SelectedMap } from '@logic-arrows/game-logic/selected-map';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import { loadInSelectedMap } from '../formats';
import { PasteFormatsPlugin } from '../index';

export const PatchSelectedMap: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'SelectedMap',
        (_module: typeof SelectedMap) => {
            return class SelectedMapWithFormats extends _module {
                private pasteSessionId = 0;

                public override pasteFromText(
                    text: string,
                    onPaste: () => void,
                    onError: () => void,
                ): void {
                    if (!PasteFormatsPlugin.isEnabled) {
                        super.pasteFromText(text, onPaste, onError);
                        return;
                    }

                    const sessionId = ++this.pasteSessionId;
                    const isCurrent = () => this.pasteSessionId === sessionId;

                    this.processPasteFromText(text, isCurrent, onPaste).catch(
                        () => {
                            if (!isCurrent()) return;

                            try {
                                super.pasteFromText(text, onPaste, onError);
                            } catch {
                                onError();
                            }
                        },
                    );
                }

                private async processPasteFromText(
                    text: string,
                    isCurrent: () => boolean,
                    onPaste: () => void,
                ): Promise<void> {
                    await loadInSelectedMap(this, text, isCurrent);

                    if (!isCurrent()) return;

                    onPaste();
                }
            };
        },
    );
};
