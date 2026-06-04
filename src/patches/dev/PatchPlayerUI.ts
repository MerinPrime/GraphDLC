import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { Game } from '@logic-arrows/player/game';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';

interface PrivatePlayerUI {
    game: Game;
}

export function PatchPlayerUI(patchLoader: PatchLoader, graphDLC: GraphDLC) {
    patchLoader.addDefinitionPatch('PlayerUI', (_module: typeof PlayerUI) => {
        return class PlayerUI extends _module {
            private devDebugInfo: HTMLDivElement | null = null;

            constructor(game: Game, mapInfo?: MapInfo) {
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
                    const astIndex = arrowAtCursor?.graphAstIndex ?? 'null';
                    info.push(`ASTIndex: ${astIndex}`);
                    const astNode = arrowAtCursor.graphAstIndex
                        ? game.gameMap.rawGraph.getNode(
                              arrowAtCursor.graphAstIndex,
                          )
                        : null;
                    if (astNode) {
                        info.push(`NextLen: ${astNode.next.length}`);
                        info.push(`PrevLen: ${astNode.previous.length}`);
                    }
                    const nodeState =
                        astNode?.index != null
                            ? game.gameMap.rawGraph.graphState.nodes[
                                  astNode.index
                              ]
                            : null;
                    if (nodeState) {
                        info.push(`Signal: ${nodeState.signal}`);
                        info.push(`SignalsCount: ${nodeState.signalsCount}`);
                    }
                }
                this.devDebugInfo.innerText = info.join('\n');
            }

            public dispose(): void {
                super.dispose();
                this.devDebugInfo?.remove();
            }
        };
    });
}
