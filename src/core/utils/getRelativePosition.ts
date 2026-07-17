export interface RelativePosition {
    x: number;
    y: number;
}

const ROTATION_MATRICES = [
    { fx: 0, fy: 1, sx: 1, sy: 0 },
    { fx: -1, fy: 0, sx: 0, sy: 1 },
    { fx: 0, fy: -1, sx: -1, sy: 0 },
    { fx: 1, fy: 0, sx: 0, sy: -1 },
];

export function getRelativePosition(
    x: number,
    y: number,
    rotation: number,
    flipped: boolean,
    forward: number = -1,
    sideways: number = 0,
): RelativePosition {
    const matrix = ROTATION_MATRICES[rotation];
    const sidewaysDist = flipped ? -sideways : sideways;

    return {
        x: x + (forward * matrix.fx + sidewaysDist * matrix.sx),
        y: y + (forward * matrix.fy + sidewaysDist * matrix.sy),
    };
}
