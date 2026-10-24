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

const BUCKET_SIZE = 128;

function getBucketKey(bx: number, by: number): number {
    return (bx * 73856093) ^ (by * 19349663);
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
                private clearedGrid: Map<number, [number, number, number][]> =
                    new Map();
                private clearedCount: number = 0;
                private _showBorder: boolean = true;
                private _disableSolidColor: boolean = false;

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
                    this.clearedGrid.clear();
                    this.clearedCount = 0;
                }

                public setShowBorder(show: boolean): void {
                    const _this = this as any as PrivateGameRender;
                    if (_this.solidColorShader === null) return;
                    this._showBorder = show;
                    _this.render.setShader(_this.solidColorShader);
                    _this.solidColorShader.uniform1i(
                        'u_showBorder',
                        show ? 1 : 0,
                    );
                }

                public get showBorder(): boolean {
                    return this._showBorder;
                }

                public setDisableSolidColor(value: boolean) {
                    this._disableSolidColor = value;
                }

                public override drawSolidColorRect(
                    x: number,
                    y: number,
                    width: number,
                    height: number,
                ): void {
                    if (this._disableSolidColor) return;
                    if (!this.showBorder && this.clearedCount > 0) {
                        const centerX = x + width / 2;
                        const centerY = y + height / 2;

                        const bx = Math.floor(centerX / BUCKET_SIZE);
                        const by = Math.floor(centerY / BUCKET_SIZE);
                        const bucket = this.clearedGrid.get(
                            getBucketKey(bx, by),
                        );

                        if (bucket !== undefined) {
                            for (let i = 0; i < bucket.length; i++) {
                                const item = bucket[i];
                                const cx = item[0];
                                const cy = item[1];
                                const size = item[2];
                                if (
                                    centerX >= cx &&
                                    centerX <= cx + size &&
                                    centerY >= cy &&
                                    centerY <= cy + size
                                ) {
                                    return;
                                }
                            }
                        }
                    }

                    super.drawSolidColorRect(x, y, width, height);
                }

                public drawArrowsRenderTexture() {
                    this.clearedGrid.clear();
                    this.clearedCount = this.clearQueue.length;

                    for (let i = 0; i < this.clearQueue.length; i++) {
                        const item = this.clearQueue[i];
                        const cx = item[0];
                        const cy = item[1];
                        const size = item[2];

                        this.internalClearArrow(cx, cy, size);

                        const minBx = Math.floor(cx / BUCKET_SIZE);
                        const maxBx = Math.floor((cx + size) / BUCKET_SIZE);
                        const minBy = Math.floor(cy / BUCKET_SIZE);
                        const maxBy = Math.floor((cy + size) / BUCKET_SIZE);

                        for (let bx = minBx; bx <= maxBx; bx++) {
                            for (let by = minBy; by <= maxBy; by++) {
                                const key = getBucketKey(bx, by);
                                let bucket = this.clearedGrid.get(key);
                                if (bucket === undefined) {
                                    bucket = [];
                                    this.clearedGrid.set(key, bucket);
                                }
                                bucket.push(item);
                            }
                        }
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
