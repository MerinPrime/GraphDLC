import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { UISpeedController } from '@logic-arrows/ui/components/ui-speed-controller';
import { PLATFORM } from '@logic-arrows/utils/platform';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

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
                    9,
                    hasPause,
                    (e: number) => {
                        if (hasPause) {
                            if (e === 0) return 'Pause';
                            e -= 1;
                        }
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
                    (value: number) => {
                        if (PLATFORM === 'mobile') {
                            if (value === 0) return 'pause';
                            value--;
                        }
                        return '';
                    },
                );
            }
        };
    });
};
