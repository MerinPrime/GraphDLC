import { GameMap } from "./gameMap";
import { Arrow } from "./arrow";

export interface SelectedMap {
    selectedArrows: Set<string>;
    arrowsToPutOriginal: Map<string, Arrow>;
    arrowsToPut: Map<string, Arrow>;
    currentSelectedArrows: Set<string>;
    currentSelectionFirstPoint?: [number, number];
    currentSelectionSecondPoint?: [number, number];
    rotationState: number;
    flipState: boolean;
    tempMap: GameMap;
    
    select(x: number, y: number): void;
    deselect(x: number, y: number): void;
    clearCurrentSelection(): void;
    clear(): void;
    getSelectedArrows(): string[];
    getCount(): number;
    updateSelectionFromCurrentSelection(): void;
    updateCurrentSelectedArea(x: number, y: number): void;
    updateMouseSelection(gameMap: GameMap, x: number, y: number, keepOldSelection?: boolean): void;
    getCurrentSelectedArea(): [number, number, number, number] | undefined;
    setArrow(type: number): void;
    copyFromGameMap(gameMap: GameMap): string;
    pasteFromText(base64Data: string, onSuccess: () => void, onError: () => void): void;
    getCopiedArrows(): Map<string, Arrow>;
    rotateOrFlipArrows(rotation?: number | null, flip?: boolean): void;
    dispose(): void;
}

export type SelectedMapProto = new () => SelectedMap;
