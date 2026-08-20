import type { Game } from '@logic-arrows/player/game';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { UISpeedController } from '@logic-arrows/ui/components/ui-speed-controller';
import { PLATFORM } from '@logic-arrows/utils/platform';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from 'src/plugins/Patcher';

interface PrivatePlayerUI {
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
        };
    });
};
