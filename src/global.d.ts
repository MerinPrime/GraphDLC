import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Chunk } from '@logic-arrows/game-logic/chunk';
import type { GraphDLC } from './core/GraphDLC';
import type { Graph } from './core/graph/ast/Graph';
import { HighlightPathData } from './plugins/connections/patches/types';
import { RenderMoveContext } from './plugins/move_selection/patches/types';
import { PathData } from './plugins/path/patches/types';
import type {
    AnyRecordOptions,
    AreaBounds,
    RenderOptions,
} from './plugins/screenshot_region/patches/types';
import {
    Mp4Options,
    VideoOptions,
} from './plugins/screenshot_region/patches/types';

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

declare module '@logic-arrows/game-render/game-render' {
    export interface GameRender {
        getBackgroundColor(): [r: number, g: number, b: number, a: number];
        clearArrow(x: number, y: number, scale: number): void;
        setDarkTheme(show: boolean): void;
        setShowBorder(show: boolean): void;
        setSides(sides: boolean[]): void;
        setFixedBorder(state: boolean): void;
        setDisableSolidColor(value: boolean): void;
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

interface SelectedArrow {
    x: number;
    y: number;

    left_side: boolean;
    top_side: boolean;
    right_side: boolean;
    bottom_side: boolean;
}

declare module '@logic-arrows/game-logic/selected-map' {
    export interface SelectedMap {
        getSelectionForRender(): SelectedArrow[];
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
        pathData: PathData | null;
        highlightPathData: HighlightPathData | null;
        renderMoveContext: RenderMoveContext | null;

        getArrowAtCursor(): Arrow | undefined;
        getDrawOffsets(): { offsetX: number; offsetY: number };

        getSelectionBounds(): {
            area: AreaBounds;
            selectedSet: Set<string>;
        } | null;

        renderRegionToCanvas(
            area: AreaBounds,
            selectedSet?: Set<string>,
            options: RenderOptions = {},
        ): HTMLCanvasElement | null;

        renderGif(options: VideoOptions): Promise<Blob | null>;
        renderApng(options: VideoOptions): Promise<Blob | null>;
        renderMp4(options: Mp4Options): Promise<Blob | null>;
        focusOnCell(x: number, y: number, speed: number = 1): void;

        captureScreenshot(options?: RenderOptions): Promise<Blob | null>;
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
        get isRecordModalOpen(): boolean;

        showVideoModal(
            onStartRecord: (options: AnyRecordOptions) => void,
            onCancel?: () => void,
        ): void;
        tryHideVideoModal(): boolean;
        stopGifRecording(): void;
        cancelGifRecording(): void;
        isGifRecording(): boolean;
    }
}

declare module '@logic-arrows/pages/game-page' {
    export interface GamePage {
        doMapSave(): Promise<void>;
        updateIsMapChanged(state: boolean): void;
    }
}
