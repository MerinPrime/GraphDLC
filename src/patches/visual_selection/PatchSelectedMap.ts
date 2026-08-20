import type { SelectedMap } from '@logic-arrows/game-logic/selected-map';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

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
                        x: x,
                        y: y,

                        left_side: true,
                        top_side: true,
                        right_side: true,
                        bottom_side: true,
                    });
                    for (let ox = -1; ox < 2; ox++) {
                        for (let oy = -1; oy < 2; oy++) {
                            this.updateSides(x + ox, y + oy);
                        }
                    }
                }

                public deselect(x: number, y: number): void {
                    super.deselect(x, y);
                    this.renderDatas.delete(`${x},${y}`);
                    for (let ox = -1; ox < 2; ox++) {
                        for (let oy = -1; oy < 2; oy++) {
                            this.updateSides(x + ox, y + oy);
                        }
                    }
                }

                public updateSides(x: number, y: number): void {
                    if (!this.renderDatas.has(`${x},${y}`)) return;

                    const data = {
                        x: x,
                        y: y,

                        left_side: !this.renderDatas.has(`${x - 1},${y}`),
                        top_side: !this.renderDatas.has(`${x},${y - 1}`),
                        right_side: !this.renderDatas.has(`${x + 1},${y}`),
                        bottom_side: !this.renderDatas.has(`${x},${y + 1}`),
                    };

                    this.renderDatas.set(`${x},${y}`, data);
                }

                public getSelectionForRender(): SelectedArrow[] {
                    return Array.from(this.renderDatas.values());
                }
            };
        },
    );
};
