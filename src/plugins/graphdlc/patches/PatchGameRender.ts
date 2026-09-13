import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Render } from '@logic-arrows/render-engine/render';
import type { RenderTexture } from '@logic-arrows/render-engine/render-texture';
import type { Shader } from '@logic-arrows/render-engine/shader';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

interface PrivateGameRender {
    readonly render: Render;
    solidColorShader: Shader | null;
    mainRenderTexture: RenderTexture | null;
    gridRenderTexture: RenderTexture | null;
}

export const PatchGameRender: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'GameRender',
        (_module: typeof GameRender) => {
            return class GameRender extends _module {
                public getBackgroundColor(): [
                    r: number,
                    g: number,
                    b: number,
                    a: number,
                ] {
                    return [1, 1, 1, 1];
                }

                public clearRenderTextures(): void {
                    const _this = this as any as PrivateGameRender;
                    const [r, g, b, a] = this.getBackgroundColor();
                    _this.render.setRenderTarget(_this.mainRenderTexture);
                    _this.render.clear(r, g, b, a);
                    _this.render.setRenderTarget(_this.gridRenderTexture);
                    _this.render.clear(r, g, b, a);
                    _this.render.setRenderTarget(null);
                }

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
