import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Render } from '@logic-arrows/render-engine/render';
import type { RenderTexture } from '@logic-arrows/render-engine/render-texture';
import type { Shader } from '@logic-arrows/render-engine/shader';
import type {
    Texture,
    TextureOptions,
} from '@logic-arrows/render-engine/texture';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { DarkThemeSetting } from 'src/plugins/dark_theme/settings/DarkThemeSetting';
import type { IPatcher } from '../../Patcher';
import { HighContrastSetting } from '../settings/HighContrastSetting';
// @ts-expect-error
import darkAtlas from './atlas.png';

interface PrivateGameRender {
    readonly render: Render;
    arrowsTexture: Texture | null;
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
            const _Texture =
                patchLoader.getDefinition<typeof Texture>('Texture');

            // @ts-expect-error
            return class GameRender extends _module {
                public getBackgroundColor(): [
                    r: number,
                    g: number,
                    b: number,
                    a: number,
                ] {
                    if (!DarkThemeSetting.value) {
                        return super.getBackgroundColor();
                    }
                    return [0.12, 0.13, 0.19, 1];
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

                public async initTextures(): Promise<void> {
                    if (!HighContrastSetting.value) {
                        // @ts-expect-error
                        return super.initTextures();
                    }
                    const _this = this as any as PrivateGameRender;
                    const textureOptions: TextureOptions = {
                        filtering: 'linear',
                        mipmaps: true,
                        mipmapLevels: 8,
                        premultiplyAlpha: true,
                    };
                    _this.arrowsTexture = await _Texture.val.load(
                        _this.render.gl,
                        darkAtlas,
                        textureOptions,
                    );
                }
            };
        },
    );
};
