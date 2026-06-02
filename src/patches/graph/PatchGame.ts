import { Arrow } from '@logic-arrows/game-logic/arrow';
import { Game } from '@logic-arrows/player/game';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';

export function PatchGame(patchLoader: PatchLoader, graphDLC: GraphDLC) {
    patchLoader.addDefinitionPatch('Game', (_module: typeof Game) => {
        return class Game extends _module {
            public getArrowAtCursor(): Arrow | undefined {
                const arrowAtCursor = this.gameMap.getArrow(
                    this.mousePosition[0],
                    this.mousePosition[1],
                );
                return arrowAtCursor;
            }
        };
    });
}
