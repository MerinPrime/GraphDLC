import {SignalWrapper} from "../graph/signalWrapper";
import {Game} from "./game";

export interface Render {
    gl: WebGLRenderingContext;

    lastArrowType: number;
    lastArrowSignal: number;
    lastArrowRotation: number;
    lastArrowFlipped: boolean;

    positionBuffer: WebGLBuffer | null;
    indexBuffer: WebGLBuffer | null;
    arrowAtlas: WebGLTexture | null;
    backgroundTexture: WebGLTexture | null;
    backgroundFrameBuffer: WebGLFramebuffer | null;

    arrowShader: any;
    backgroundShader: any;
    solidColorShader: any;
    textureShader: any;
    game?: Game;

    resize(width: number, height: number): void;

    prepareArrows(size: number): void;
    setArrowAlpha(alpha: number): void;
    disableArrows(): void;
    drawArrow(
        x: number,
        y: number,
        type: number,
        signal: number | SignalWrapper,
        rotation: number,
        flipped: boolean
    ): void;

    prepareTextures(texture: WebGLTexture | null, tiles?: number): void;
    disableTextures(): void;
    drawTexture(x: number, y: number, size: number): void;

    prepareSolidColor(): void;
    disableSolidColor(): void;
    setSolidColor(r: number, g: number, b: number, a: number): void;
    drawSolidColor(x: number, y: number, w: number, h: number): void;

    drawBackground(scale: number, offset: [number, number]): void;

    createArrowTexture(image: TexImageSource): void;

    initBuffers(): void;
    initBackgroundTexture(): void;

    prepareBackgroundOrigin(): void;
    disableBackgroundOrigin(): void;
    drawBackgroundOrigin(scale: number, offset: [number, number]): void;

    dispose(): void;
}

export type RenderProto = new (
    gl: WebGLRenderingContext
) => Render;
