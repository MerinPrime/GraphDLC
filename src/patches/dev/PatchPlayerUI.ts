import type { Game } from '@logic-arrows/player/game';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { UISpeedController } from '@logic-arrows/ui/components/ui-speed-controller';
import { PLATFORM } from '@logic-arrows/utils/platform';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

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

    patchLoader.addDefinitionPatch('PlayerUI', (_module: typeof PlayerUI) => {
        return class PlayerUI extends _module {
            public addSpeedController() {
                const hasPause = PLATFORM === 'mobile';
                this.speedController = new _UISpeedController.def(
                    document.body,
                    10,
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
            }

            public updateFpsDisplay(): void {
                const _this = this as any as PrivatePlayerUI;
                if (_this.fpsDisplay === null || _this.game === null) return;
                const fps = _this.game.getFPS();
                const tps = _this.game.getTPS();
                const tick = _this.game.gameMap.graph.engine.getTick();
                _this.fpsDisplay.innerText = `FPS: ${fps}\nTPS: ${tps}\nTick: ${tick}`;
            }
        };
    });
};
