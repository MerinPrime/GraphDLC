import { GraphDLC } from './core/GraphDLC';
import { Arrow as OriginalArrow } from '@logic-arrows/game-logic/arrow';
import { GameMap as OriginalGameMap } from '@logic-arrows/game-logic/game-map';
import { PlayerUI as OriginalPlayerUI } from '@logic-arrows/player/player-ui';
import { Game as OriginalGame } from '@logic-arrows/player/game';
declare global {
    interface Window {
        graphdlc: GraphDLC;
        patchWebpackModules: (
            modules: Record<string | number, Function>,
        ) => Record<string | number, Function>;
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
