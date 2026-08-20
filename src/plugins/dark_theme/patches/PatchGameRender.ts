import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Render } from '@logic-arrows/render-engine/render';
import type { RenderTexture } from '@logic-arrows/render-engine/render-texture';
import type { Shader } from '@logic-arrows/render-engine/shader';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { DarkThemeSetting } from 'src/plugins/dark_theme/settings/DarkThemeSetting';
import type { IPatcher } from '../../Patcher';

interface PrivateGameRender {
    readonly render: Render;
    mainRenderTexture: RenderTexture | null;
    gridRenderTexture: RenderTexture | null;
    chunkArrowShader: Shader | null;
}

export const PatchGameRender: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'GameRender',
        (_module: typeof GameRender) => {
            return class GameRender extends _module {
                public clearRenderTextures(): void {
                    if (!DarkThemeSetting.value) {
                        super.clearRenderTextures();
                        return;
                    }
                    const _this = this as any as PrivateGameRender;
                    _this.render.setRenderTarget(_this.mainRenderTexture);
                    _this.render.clear(0.12, 0.13, 0.19, 1);
                    _this.render.setRenderTarget(_this.gridRenderTexture);
                    _this.render.clear(0.12, 0.13, 0.19, 1);
                    _this.render.setRenderTarget(null);
                }

                public setDarkTheme(show: boolean): void {
                    const _this = this as any as PrivateGameRender;
                    if (_this.chunkArrowShader === null) return;
                    _this.render.setShader(_this.chunkArrowShader);
                    _this.chunkArrowShader.uniform1i(
                        'u_dark_theme',
                        show ? 1 : 0,
                    );
                }
            };
        },
    );
};
