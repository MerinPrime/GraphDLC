import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { Game } from '@logic-arrows/player/game';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { UISpeedController } from '@logic-arrows/ui/components/ui-speed-controller';
import { PLATFORM } from '@logic-arrows/utils/platform';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

interface PrivatePlayerUI {
    readonly game: Game;
}

export const PatchPlayerUI: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    const _UISpeedController =
        patchLoader.getDefinition<typeof UISpeedController>(
            'UISpeedController',
        );

    patchLoader.addDefinitionPatch('PlayerUI', (_module: typeof PlayerUI) => {
        return class PlayerUI extends _module {
            private devDebugInfo: HTMLDivElement | null = null;

            public constructor(game: Game, mapInfo?: MapInfo) {
                super(game, mapInfo);
                this.addDevDebugInfo();
            }

            public addDevDebugInfo(): void {
                if (this.devDebugInfo === null) {
                    this.devDebugInfo = document.createElement('div');
                    this.devDebugInfo.className = 'ui-dev-debug-info';
                    this.devDebugInfo.innerText = 'Dev debug info';
                    document.body.appendChild(this.devDebugInfo);
                }
            }

            public updateDevDebugInfo(): void {
                if (this.devDebugInfo === null) {
                    return;
                }
                const info: string[] = [];
                const game = (this as any as PrivatePlayerUI).game;
                const arrowAtCursor = game.getArrowAtCursor();
                if (arrowAtCursor) {
                    const astIndex = arrowAtCursor?.astIndex ?? 'null';
                    info.push(`ASTIndex: ${astIndex}`);
                    const astNode =
                        arrowAtCursor.astIndex != null
                            ? game.gameMap.rawGraph.getNode(
                                  arrowAtCursor.astIndex,
                              )
                            : null;
                    if (astNode) {
                        info.push(`NextLen: ${astNode.next.length}`);
                        info.push(`PrevLen: ${astNode.previous.length}`);
                        info.push(`IsCycle: ${astNode.isCycle}`);
                        info.push(`IsBreakpoint: ${astNode.isBreakpoint}`);
                        info.push(`CycleOffset: ${astNode.cycleOffset}`);
                        info.push(
                            `OrigCycleOffset: ${astNode.origCycleOffset}`,
                        );
                    }
                    const nodeState =
                        astNode?.nodeIdx != null
                            ? game.gameMap.rawGraph.graphState.getNode(
                                  astNode.nodeIdx,
                              )
                            : null;
                    if (nodeState) {
                        info.push(`Signal: ${nodeState.signal}`);
                        info.push(`LastSignal: ${nodeState.lastSignal}`);
                        info.push(`SignalsCount: ${nodeState.signalsCount}`);
                        info.push(`BlockedCount: ${nodeState.blockedCount}`);
                    }
                }
                this.devDebugInfo.innerText = info.join('\n');
            }

            public addSpeedController() {
                this.speedController = new _UISpeedController.def(
                    document.body,
                    9,
                    PLATFORM === 'mobile',
                    (e: number) => {
                        const TPS_LIMITS = [
                            '3',
                            '12',
                            '60',
                            '300',
                            '1200',
                            '6000',
                            '30000',
                            '120000',
                            'MAX',
                        ];
                        return `${TPS_LIMITS[e]} TPS`;
                    },
                );
            }

            public dispose(): void {
                super.dispose();
                this.devDebugInfo?.remove();
            }
        };
    });
};
