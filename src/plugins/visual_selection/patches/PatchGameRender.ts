import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Render } from '@logic-arrows/render-engine/render';
import type { Shader } from '@logic-arrows/render-engine/shader';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

interface PrivateGameRender {
    readonly render: Render;
    solidColorShader: Shader | null;
}

export const PatchGameRender: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'GameRender',
        (_module: typeof GameRender) => {
            return class GameRender extends _module {
                public setFixedBorder(state: boolean): void {
                    const _this = this as any as PrivateGameRender;
                    if (_this.solidColorShader === null) return;
                    _this.render.setShader(_this.solidColorShader);
                    _this.solidColorShader.uniform1i(
                        'u_isSelection',
                        state ? 1 : 0,
                    );
                }

                public setSides(sides: boolean[]): void {
                    const _this = this as any as PrivateGameRender;
                    if (_this.solidColorShader === null) return;
                    _this.render.setShader(_this.solidColorShader);
                    const [x, y, z, w] = sides.map((value) => (value ? 1 : 0));
                    _this.solidColorShader.uniform4f('u_sides', x, y, z, w);
                }
            };
        },
    );
};
