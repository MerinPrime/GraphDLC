import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Render } from '@logic-arrows/render-engine/render';
import type { RenderTexture } from '@logic-arrows/render-engine/render-texture';
import type { Shader } from '@logic-arrows/render-engine/shader';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

interface PrivateGameRender {
    readonly canvas: HTMLCanvasElement;
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
                private clearQueue: [number, number, number][] = [];

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

                public drawArrowsRenderTexture() {
                    for (const [x, y, size] of this.clearQueue) {
                        this.internalClearArrow(x, y, size);
                    }
                    this.clearQueue.length = 0;
                    super.drawArrowsRenderTexture();
                }

                private internalClearArrow(
                    x: number,
                    y: number,
                    size: number,
                ): void {
                    const _this = this as any as PrivateGameRender;
                    if (_this.mainRenderTexture === null) return;

                    const gl = _this.render.gl;

                    _this.render.setRenderTarget(_this.mainRenderTexture);

                    gl.enable(gl.SCISSOR_TEST);

                    const left = Math.floor(x);
                    const right = Math.ceil(x + size);

                    const top = Math.floor(y);
                    const bottom = Math.ceil(y + size);

                    const scissorX = left;
                    const scissorY = _this.canvas.height - bottom;

                    gl.scissor(scissorX, scissorY, right - left, bottom - top);

                    const [r, g, b, a] = this.getBackgroundColor();

                    gl.clearColor(r, g, b, a);
                    gl.clear(gl.COLOR_BUFFER_BIT);

                    gl.disable(gl.SCISSOR_TEST);

                    _this.render.setRenderTarget(null);
                }

                public clearArrow(x: number, y: number, size: number): void {
                    this.clearQueue.push([x, y, size]);
                }
            };
        },
    );
};
