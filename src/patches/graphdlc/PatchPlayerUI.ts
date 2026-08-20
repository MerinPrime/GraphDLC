import type { Game } from '@logic-arrows/player/game';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
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
    patchLoader.addDefinitionPatch('PlayerUI', (_module: typeof PlayerUI) => {
        return class PlayerUI extends _module {
            public startTickFrom: number = 0;

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
            }
        };
    });
};
