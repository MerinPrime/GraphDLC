import { Arrow as OriginalArrow } from '@logic-arrows/game-logic/arrow';

declare global {
    interface Window {
        graphdlc: GraphDLC;
        patchWebpackModules: (
            modules: Record<string | number, Function>,
        ) => Record<string | number, Function>;
    }
}

declare module '@logic-arrows/game-render/game-render' {
    export interface GameRender {
        setShowBorder(show: boolean): void;
    }
}

declare module '@logic-arrows/game-logic/arrow' {
    export interface Arrow {
        graphAstIndex?: number | null;
    }
}

declare module '@logic-arrows/player/player-ui' {
    export interface PlayerUI {
        updateDevDebugInfo(): void;
    }
}

declare module '@logic-arrows/player/game' {
    export interface Game {
        getArrowAtCursor(): OriginalArrow | undefined;
    }
}
