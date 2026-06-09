import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Render } from '@logic-arrows/render-engine/render';
import type { Shader } from '@logic-arrows/render-engine/shader';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

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
            return class GameMap extends _module {
                public setShowBorder(show: boolean): void {
                    const _this = this as any as PrivateGameRender;
                    if (_this.solidColorShader === null) return;
                    _this.render.setShader(_this.solidColorShader);
                    _this.solidColorShader.uniform1i(
                        'u_showBorder',
                        show ? 1 : 0,
                    );
                }
            };
        },
    );
};
