import { Game } from "./game";
import { PlayerUI } from "./playerUI";
import { History } from "./history"; // TODO: implement this
import { MouseHandler } from "./mouse_handler";
import { KeyboardHandler } from "./keyboard_handler";
import { PlayerAccess } from "./player_access";
import { Arrow } from "./arrow";

export interface PlayerControls {
    onPaste: () => void;
    onPasteError: () => void;
    keyDownCallback: (key: string, repeat: boolean) => void;
    keyUpCallback: (key: string) => void;
    leftClickCallback: () => void;
    wheelCallback: (delta: number) => void;
    pasteEvent: (ev: ClipboardEvent) => void;
    copyEvent: (ev: ClipboardEvent) => void;

    playerAccess: PlayerAccess;
    mouseHandler: MouseHandler;
    keyboardHandler: KeyboardHandler;
    game: Game;
    playerUI: PlayerUI;
    history: History | null;

    flipDirection: boolean;
    mousePosPrev: [number, number];
    mousePressedPrev: boolean;
    wheelDelta: number;
    freeCursor: boolean;
    activeArrowType: number;
    keyboardZoomVelocity: number;
    keyboardMoveVelocity: [number, number];
    arrowStartPoint: [number, number] | null;
    controlsHints: boolean;
    maxZoomOut: number;

    updatePlayerAccess(access: Partial<PlayerAccess>): void;
    getPlayerAccess(): PlayerAccess;
    update(): void;
    dispose(): void;
    updateControlsHints(): void;

    getArrowByMousePosition(): Arrow | undefined;
    selectToolBarArrow(type: number): void;
    takeArrow(type: number): void;
    takeCursor(): void;

    undo(): void;
    redo(): void;

    moveCamera(screenX: number, screenY: number): void;
    handleZoom(delta: number, useMousePosition: boolean): void;

    togglePause(): void;

    setArrows(x: number, y: number): void;
    deleteArrow(x: number, y: number): void;
    deleteSelectedArrows(): void;

    rotateArrow(x: number, y: number, direction: number): void;
    flipArrow(x: number, y: number): void;
    selectArrows(x: number, y: number): void;

    copyArrows(): Promise<void>;
    pasteArrows(): Promise<void>;
    cutArrows(): void;
    pickArrow(): void;
    runOneTick(): void;
    clearSignals(): void;
}

export type PlayerControlsProto = new (
    container: HTMLElement,
    game: Game,
    playerUI: PlayerUI,
    history?: History | null
) => PlayerControls;
