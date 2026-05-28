import { GameMap } from "./gameMap";
import { SelectedMap } from "./selectedMap";
import { Render } from "./render";

export interface Game {
    updateTime: number;
    drawTime: number;
    updatesPerSecond: number;
    drawsPerSecond: number;
    focusingTime: number;
    focusingSpeed: number;
    focusingOffset: [number, number];
    focusingScale: number;
    startingOffset: [number, number];
    startingScale: number;
    focusing: boolean;
    width: number;
    height: number;
    frame: number;
    tick: number;
    playing: boolean;
    updateSpeedLevel: number;
    pasteDirection: number;
    isSelecting: boolean;
    mousePosition: [number, number];
    gameMap: GameMap;
    selectedMap: SelectedMap;
    scale: number;
    offset: [number, number];
    screenUpdated: boolean;
    drawPastedArrows: boolean;
    render: Render;
    
    draw(): void;
    updateFrame(callback?: () => void): void;
    updateTick(callback?: () => void): void;
    undoChanges(changes: any): void;
    redoChanges(changes: any): void;
    clearSignals(): void;
    focusOnBox(x0: number, y0: number, x1: number, y1: number, padding?: number, speed?: number): void;
    updateFocus(): void;
    setScale(scale: number, center: [number, number]): void;
    resize(width: number, height: number): void;
    dispose(): void;
}

export type GameProto = new (
    canvas: HTMLCanvasElement, width: number, height: number
) => Game;
