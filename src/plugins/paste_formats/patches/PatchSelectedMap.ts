import { Arrow } from '@logic-arrows/game-logic/arrow';
import type { SelectedMap } from '@logic-arrows/game-logic/selected-map';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import {
    type ArrowCell,
    normalizeCellForBrowser,
    readArrowsMap,
} from '../formats';
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

                    this.processPasteFromText(text, sessionId, onPaste).catch(
                        () => {
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
                    sessionId: number,
                    onPaste: () => void,
                ): Promise<void> {
                    const mapData = await readArrowsMap(text);
                    if (this.pasteSessionId !== sessionId) return;

                    const uniqueCells = new Map<string, ArrowCell>();
                    let minX = Infinity;
                    let minY = Infinity;
                    let placedCount = 0;

                    for (const cell of mapData.cells) {
                        uniqueCells.set(`${cell.x},${cell.y}`, cell);
                    }

                    for (const cell of uniqueCells.values()) {
                        if (cell.type !== 0) {
                            minX = Math.min(minX, cell.x);
                            minY = Math.min(minY, cell.y);
                            placedCount++;
                        }
                    }

                    if (
                        placedCount === 0 ||
                        minX === Infinity ||
                        minY === Infinity
                    ) {
                        throw new Error('No arrows found');
                    }

                    this.tempMap.clear();
                    this.arrowsToPutOriginal.clear();
                    this.arrowsToPut.clear();
                    this.rotationState = 0;
                    this.flipState = false;

                    for (const cell of uniqueCells.values()) {
                        if (cell.type === 0) continue;

                        const { type, rotation, flipped } =
                            normalizeCellForBrowser(
                                cell.type,
                                cell.rotation,
                                cell.flipped,
                                mapData.version,
                            );

                        const normX = cell.x - minX;
                        const normY = cell.y - minY;

                        this.tempMap.setArrowType(normX, normY, type, false);
                        this.tempMap.setArrowRotation(
                            normX,
                            normY,
                            rotation,
                            false,
                        );
                        this.tempMap.setArrowFlipped(
                            normX,
                            normY,
                            flipped,
                            false,
                        );

                        const arrow = new Arrow();
                        arrow.type = type;
                        arrow.rotation = rotation;
                        arrow.flipped = flipped;
                        arrow.canBeEdited = true;

                        const key = `${normX},${normY}`;
                        this.arrowsToPutOriginal.set(key, arrow);
                        this.arrowsToPut.set(key, arrow);
                    }

                    if (this.pasteSessionId !== sessionId) return;

                    onPaste();
                }
            };
        },
    );
};
