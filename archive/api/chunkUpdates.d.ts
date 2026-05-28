import {GameMap} from "./gameMap";
import {Arrow} from "./arrow";

export interface ChunkUpdates {
    update(gameMap: GameMap, tick: number);
    wasArrowChanged(arrow: Arrow);
    clearSignals(gameMap: GameMap);
}
