import { ArrowType } from "../api/arrow_type";
import { GameMap } from "../api/game_map";
import { LayersDLC } from "../core/layersdlc";

export function PatchGameMap(layersdlc: LayersDLC) {
    layersdlc.patchLoader.addDefinitionPatch("GameMap", function (module: any): any {
        layersdlc.patchLoader.setDefinition("GameMap", class GameMapPatched extends module {
            constructor(...args: any[]) {
                super(...args);
            }
            setArrowType(x: number, y: number, type: ArrowType) {
                super.setArrowType(x, y, type);
                layersdlc.invalidateGraph();
            }
            setArrowSignal(x: number, y: number, signal: number) {
                super.setArrowSignal(x, y, signal);
                layersdlc.invalidateGraph();
            }
            setArrowRotation(x: number, y: number, direction: number) {
                super.setArrowRotation(x, y, direction);
                layersdlc.invalidateGraph();
            }
            setArrowFlipped(x: number, y: number, flipped: boolean) {
                super.setArrowFlipped(x, y, flipped);
                layersdlc.invalidateGraph();
            }
            resetArrow(x: number, y: number, force: boolean) {
                super.resetArrow(x, y, force);
                layersdlc.invalidateGraph();
            }
            removeArrow(x: number, y: number) {
                super.removeArrow(x, y);
                layersdlc.invalidateGraph();
            }
        });
    });
}

