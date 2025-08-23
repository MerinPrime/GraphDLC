import { ArrowType } from "../api/arrow_type";
import { GameMap } from "../api/game_map";
import { LayersDLC } from "../core/layersDLC";

export function PatchGameMap(layersDLC: LayersDLC) {
    layersDLC.patchLoader.addDefinitionPatch("GameMap", function (module: any): any {
        layersDLC.patchLoader.setDefinition("GameMap", class GameMapPatched extends module {
            constructor(...args: any[]) {
                super(...args);
            }
            setArrowType(x: number, y: number, type: ArrowType) {
                super.setArrowType(x, y, type);
                layersDLC.invalidateGraph();
            }
            setArrowSignal(x: number, y: number, signal: number) {
                super.setArrowSignal(x, y, signal);
                layersDLC.invalidateGraph();
            }
            setArrowRotation(x: number, y: number, direction: number) {
                super.setArrowRotation(x, y, direction);
                layersDLC.invalidateGraph();
            }
            setArrowFlipped(x: number, y: number, flipped: boolean) {
                super.setArrowFlipped(x, y, flipped);
                layersDLC.invalidateGraph();
            }
            resetArrow(x: number, y: number, force: boolean) {
                super.resetArrow(x, y, force);
                layersDLC.invalidateGraph();
            }
            removeArrow(x: number, y: number) {
                super.removeArrow(x, y);
                layersDLC.invalidateGraph();
            }
        });
    });
}

