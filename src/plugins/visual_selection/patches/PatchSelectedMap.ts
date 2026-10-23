import type { SelectedMap } from '@logic-arrows/game-logic/selected-map';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

interface SelectedArrow {
    x: number;
    y: number;

    left_side: boolean;
    top_side: boolean;
    right_side: boolean;
    bottom_side: boolean;
}

export const PatchSelectedMap: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'SelectedMap',
        (_module: typeof SelectedMap) => {
            return class SelectedMap extends _module {
                private renderDatas: Map<string, SelectedArrow> = new Map();

                public clear(): void {
                    super.clear();
                    this.renderDatas.clear();
                }

                public select(x: number, y: number): void {
                    super.select(x, y);
                    this.renderDatas.set(`${x},${y}`, {
                        x,
                        y,
                        left_side: true,
                        top_side: true,
                        right_side: true,
                        bottom_side: true,
                    });

                    this.updateSides(x, y);
                    this.updateSides(x - 1, y);
                    this.updateSides(x + 1, y);
                    this.updateSides(x, y - 1);
                    this.updateSides(x, y + 1);
                }

                public deselect(x: number, y: number): void {
                    super.deselect(x, y);
                    this.renderDatas.delete(`${x},${y}`);

                    this.updateSides(x - 1, y);
                    this.updateSides(x + 1, y);
                    this.updateSides(x, y - 1);
                    this.updateSides(x, y + 1);
                }

                public updateSides(x: number, y: number): void {
                    const key = `${x},${y}`;
                    const current = this.renderDatas.get(key);

                    if (!current) return;

                    const left_side = !this.renderDatas.has(`${x - 1},${y}`);
                    const top_side = !this.renderDatas.has(`${x},${y - 1}`);
                    const right_side = !this.renderDatas.has(`${x + 1},${y}`);
                    const bottom_side = !this.renderDatas.has(`${x},${y + 1}`);

                    if (
                        current.left_side === left_side &&
                        current.top_side === top_side &&
                        current.right_side === right_side &&
                        current.bottom_side === bottom_side
                    ) {
                        return;
                    }

                    this.renderDatas.set(key, {
                        x,
                        y,
                        left_side,
                        top_side,
                        right_side,
                        bottom_side,
                    });
                }

                public getSelectionForRender(): SelectedArrow[] {
                    return this.getSelectedArrows()
                        .map((arKey) => this.renderDatas.get(arKey))
                        .filter((data) => data !== undefined);
                }
            };
        },
    );
};
