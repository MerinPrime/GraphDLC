export interface RelativePosition {
    x: number;
    y: number;
}

export function getRelativePosition(
    x: number,
    y: number,
    rotation: number,
    flipped: boolean,
    forward: number = -1,
    sideways: number = 0,
): RelativePosition {
    if (flipped) sideways = -sideways;

    switch (rotation) {
        case 0:
            y += forward;
            x += sideways;
            break;
        case 1:
            x -= forward;
            y += sideways;
            break;
        case 2:
            y -= forward;
            x -= sideways;
            break;
        case 3:
            x += forward;
            y -= sideways;
            break;
    }

    return {
        x,
        y,
    };
}
