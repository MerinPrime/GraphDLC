import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Game } from '@logic-arrows/player/game';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { UISpeedController } from '@logic-arrows/ui/components/ui-speed-controller';
import { PLATFORM } from '@logic-arrows/utils/platform';
import type { GraphDLC } from 'src/core/GraphDLC';
import { DebugNodeSignal } from 'src/core/graph/engines/core/NodeSignal';
import { RawEngine } from 'src/core/graph/engines/raw/RawEngine';
import type { PatchLoader } from 'src/core/PatchLoader';
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
    const _UISpeedController =
        patchLoader.getDefinition<typeof UISpeedController>(
            'UISpeedController',
        );

    const PlayerControls =
        patchLoader.getInstance<PrivatePlayerControls>('PlayerControls');

    patchLoader.addDefinitionPatch('PlayerUI', (_module: typeof PlayerUI) => {
        return class PlayerUI extends _module {
            public startTickFrom: number = 0;

            public addSpeedController() {
                const hasPause = PLATFORM === 'mobile';
                this.speedController = new _UISpeedController.val(
                    document.body,
                    11,
                    hasPause,
                    (e: number) => {
                        if (hasPause) {
                            if (e === 0) return 'Pause';
                            e -= 1;
                        }
                        const TPS_LIMITS = [
                            'CUSTOM',
                            '3',
                            '12',
                            '60',
                            '300',
                            '1200',
                            '6000',
                            '30000',
                            '120000',
                            '600000',
                            'MAX',
                        ];
                        return `${TPS_LIMITS[e]} TPS`;
                    },
                    (value: number) => {
                        if (PLATFORM === 'mobile') {
                            if (value === 0) return 'pause';
                            value--;
                        }
                        return '';
                    },
                );
                const _this = this as any as PrivatePlayerUI;
                if (_this.game) _this.game.updateSpeedLevel = 1;
            }

            public addFpsDisplay(): void {
                const _this = this as any as PrivatePlayerUI;
                super.addFpsDisplay();
                _this.fpsDisplay?.addEventListener('click', () => {
                    const targetStartOffset =
                        _this.game?.gameMap.graph.engine.getTick() ?? 0;

                    if (this.startTickFrom === targetStartOffset) {
                        this.startTickFrom = 0;
                    } else {
                        this.startTickFrom = targetStartOffset;
                    }
                    this.updateFpsDisplay();
                });
            }

            public updateFpsDisplay(): void {
                const _this = this as any as PrivatePlayerUI;
                if (_this.fpsDisplay === null || _this.game === null) return;
                const fps = _this.game.getFPS();
                const tps = _this.game.getTPS();
                const tick = _this.game.gameMap.graph.engine.getTick();
                const tickCounter = tick - this.startTickFrom;
                if (tickCounter < 0 || this.startTickFrom === 0) {
                    _this.fpsDisplay.innerText = `FPS: ${fps}\nTPS: ${tps}\nTick: ${tick}`;
                } else {
                    _this.fpsDisplay.innerText = `FPS: ${fps}\nTPS: ${tps}\nTick: +${tickCounter}`;
                }
                if (__DEBUG__) {
                    const graph = _this.game.gameMap.graph;
                    const engine = graph.engine;
                    const debugLines: string[] = [];
                    if (engine instanceof RawEngine) {
                        const arrow =
                            PlayerControls.val?.getArrowByMousePosition();
                        if (!arrow) {
                            debugLines.push('arrow null');
                        } else if (
                            arrow.astIndex === null ||
                            arrow.astIndex === undefined
                        ) {
                            debugLines.push('ast index null');
                        } else {
                            const nodeIdx = arrow.astIndex;
                            const nodeState = engine.state.getNode(nodeIdx);
                            debugLines.push(
                                `signal: ${DebugNodeSignal[nodeState.signal]}`,
                            );
                            debugLines.push(
                                `signalsCount: ${nodeState.signalsCount}`,
                            );
                            debugLines.push(
                                `blockedCount: ${nodeState.blockedCount}`,
                            );
                            debugLines.push(
                                `isChanged: ${nodeState.isChanged}`,
                            );
                        }
                    } else {
                        debugLines.push('non raw engine');
                    }
                    _this.fpsDisplay.innerText += `\n${debugLines.join('\n')}`;
                }
            }
        };
    });
};
