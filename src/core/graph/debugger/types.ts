export type RenderDebugColor = (
    x: number,
    y: number,
    color: DebugColor,
) => void;

export type DebugColor = [r: number, g: number, b: number, a: number];

export type INodeDebugData = {};
