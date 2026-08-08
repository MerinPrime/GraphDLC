import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { GraphDLC } from './core/GraphDLC';
import type { Graph } from './core/graph/ast/Graph';

declare global {
    declare const __CURRENT_VERSION__: string;
    declare const __DEBUG__: boolean;

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
        graph: Graph;
        isMain: boolean;

        updateArrowState(
            arrow: Arrow,
            chunk: Chunk,
            chunkX: number,
            chunkY: number,
        );

        getOrCreateArrow(x: number, y: number): [Chunk, Arrow];
    }
}

declare module '@logic-arrows/player/game' {
    export interface Game {
        customTPS: number;

        getArrowAtCursor(): Arrow | undefined;
    }
}

declare module '@logic-arrows/game-logic/chunk-updates' {
    export namespace ChunkUpdates {
        export function oldUpdate(map: GameMap): void;
        export function oldClearSignals(map: GameMap): void;
    }
}

declare module '@logic-arrows/player/player-arrow-actions' {
    export interface PlayerArrowActions {
        hideSelectionTip(): void;
    }
}

declare module '@logic-arrows/ui/components/ui-speed-controller' {
    export interface UISpeedController {
        customTPSField: CustomTPSComponent | null;
    }
}

declare module '@logic-arrows/player/player-ui' {
    export interface PlayerUI {
        startTickFrom: number;
    }
}

declare module '@logic-arrows/pages/game-page' {
    export interface GamePage {
        doMapSave(): Promise<void>;
        updateIsMapChanged(state: boolean): void;
    }
}
