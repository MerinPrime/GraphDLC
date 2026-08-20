import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Game } from '@logic-arrows/player/game';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import { DebugNodeSignal } from 'src/core/graph/engines/core/NodeSignal';
import { RawEngine } from 'src/core/graph/engines/raw/RawEngine';
import type { PatchLoader } from 'src/core/PatchLoader';
import { DeveloperModeSetting } from 'src/core/settings/instances/developer/DeveloperModeSetting';
import type { IPatcher } from '../Patcher';

interface PrivatePlayerControls {
    getArrowByMousePosition(): Arrow | undefined;
}

interface PrivatePlayerUI {
    fpsDisplay: HTMLDivElement | null;
    game: Game | null;
}

export const PatchPlayerUI: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    const PlayerControls =
        patchLoader.getInstance<PrivatePlayerControls>('PlayerControls');

    patchLoader.addDefinitionPatch('PlayerUI', (_module: typeof PlayerUI) => {
        return class PlayerUI extends _module {
            public updateFpsDisplay(): void {
                const _this = this as any as PrivatePlayerUI;
                if (_this.fpsDisplay === null || _this.game === null) return;
                super.updateFpsDisplay();
                if (DeveloperModeSetting.value) {
                    const graph = _this.game.gameMap.graph;
                    const engine = graph.engine;
                    const debugLines: string[] = [];
                    if (engine instanceof RawEngine) {
                        const arrow =
                            PlayerControls.val?.getArrowByMousePosition();
                        if (!arrow) {
                            debugLines.push('Arrow is null');
                        } else if (
                            arrow.astIndex === null ||
                            arrow.astIndex === undefined
                        ) {
                            debugLines.push('AST Index is null');
                        } else {
                            const nodeIdx = arrow.astIndex;
                            const node = graph.getNode(nodeIdx);
                            const nodeState = engine.state.getNode(nodeIdx);
                            debugLines.push(
                                `Position: [${node.globalX}, ${node.globalY}]`,
                            );
                            debugLines.push(
                                `Signal: ${DebugNodeSignal[nodeState.signal]}`,
                            );
                            debugLines.push(
                                `SignalsCount: ${nodeState.signalsCount}`,
                            );
                            debugLines.push(
                                `BlockedCount: ${nodeState.blockedCount}`,
                            );
                            debugLines.push(
                                `IsChanged: ${nodeState.isChanged}`,
                            );
                        }
                    } else {
                        debugLines.push('Not Raw Engine');
                    }
                    _this.fpsDisplay.innerText += `\n${debugLines.join('\n')}`;
                }
            }
        };
    });
};
