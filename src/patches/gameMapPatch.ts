import { ArrowType } from "../api/arrowType";
import {GameMap, GameMapProto} from "../api/gameMap";
import { GraphDLC } from "../core/graphDLC";

export function PatchGameMap(graphDLC: GraphDLC) {
    const patchLoader = graphDLC.patchLoader;

    patchLoader.addDefinitionPatch("GameMap", function (module: GameMapProto): any {
        patchLoader.setDefinition("GameMap", class GameMap_GDLC extends module {
            setArrowType(x: number, y: number, type: ArrowType) {
                super.setArrowType(x, y, type);
                graphDLC.invalidateGraph();
            }
            setArrowSignal(x: number, y: number, signal: number) {
                super.setArrowSignal(x, y, signal);
                graphDLC.invalidateGraph();
            }
            setArrowRotation(x: number, y: number, direction: number) {
                super.setArrowRotation(x, y, direction);
                graphDLC.invalidateGraph();
            }
            setArrowFlipped(x: number, y: number, flipped: boolean) {
                super.setArrowFlipped(x, y, flipped);
                graphDLC.invalidateGraph();
            }
            resetArrow(x: number, y: number, force: boolean) {
                super.resetArrow(x, y, force);
                graphDLC.invalidateGraph();
            }
            removeArrow(x: number, y: number) {
                super.removeArrow(x, y);
                graphDLC.invalidateGraph();
            }
        });
    });
}

