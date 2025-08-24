import {GameMap} from "./game_map";

export interface Game {
    tick: number;
    gameMap: GameMap;
    
    draw(): void;
    updateFrame(callback: () => any): void;
}

export type GameConstructor = new (
    e, t, s
) => Game;
