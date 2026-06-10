import type { Arrow as OriginalArrow } from '@logic-arrows/game-logic/arrow';
import type { GraphDLC } from './core/GraphDLC';
import type { Graph } from './core/graph/Graph';

declare global {
    interface Window {
        graphdlc: GraphDLC;
        patchWebpackModules: (
            modules: Record<string | number, Function>,
        ) => Record<string | number, Function>;
    }
}

declare module '@logic-arrows/player/game' {
    export interface Game {
        path: PathStep[] | null;
    }
}

declare module '@logic-arrows/game-render/game-render' {
    export interface GameRender {
        setShowBorder(show: boolean): void;
    }
}

declare module '@logic-arrows/game-logic/chunk' {
    export interface Chunk {
        astIndex?: number | null;

        getArrows(): readonly Arrow[];
    }
}

declare module '@logic-arrows/game-logic/arrow' {
    export interface Arrow {
        astIndex?: number | null;
    }
}

declare module '@logic-arrows/game-logic/game-map' {
    export interface GameMap {
        rawGraph: Graph;
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
