import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { Game } from '@logic-arrows/player/game';
import type { UIPauseSign } from '@logic-arrows/ui/components/ui-pause-sign';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { TargetFPSSetting } from 'src/core/settings/instances/performance/TargetFPSSetting';
import { TPSOverloadSetting } from 'src/core/settings/instances/performance/TPSOverloadSetting';
import {
    BreakpointMode,
    EnableBreakpointSetting,
} from 'src/core/settings/instances/tools/EnableBreakpointSetting';
import type { IPatcher } from '../Patcher';

interface PrivateGame {
    gameMap: GameMap;

    updateTime: number;
    tps: number;
    tick: number;
    updatesPerSecond: number;
}

export const PatchGame: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    let renderDelta = 0;
    let lastUpdateTime = -1;
    let accumulator = 0;
    let previousSpeed = 0;

    let adaptiveBatchSize = 100;

    const uiPauseSign = patchLoader.getInstance<UIPauseSign>('UIPauseSign');

    patchLoader.addDefinitionPatch('Game', (_module: typeof Game) => {
        return class Game extends _module {
            public customTPS: number = 1;

            public draw() {
                const renderStart = performance.now();

                super.draw();

                const renderEnd = performance.now();
                renderDelta = renderEnd - renderStart;
            }

            public focusOnCell(x: number, y: number, speed: number = 1): void {
                const boxWidth: number =
                    this.width / 40 / window.devicePixelRatio;
                const boxHeight: number =
                    this.height / 40 / window.devicePixelRatio;

                const x0 = x - boxWidth / 2;
                const x1 = x + boxWidth / 2;
                const y0 = y - boxHeight / 2;
                const y1 = y + boxHeight / 2;

                this.focusOnBox(x0, y0, x1, y1, 0, speed);
            }

            public updateFrame(payload = () => {}) {
                const _this = this as any as PrivateGame;

                if (!this.playing) {
                    lastUpdateTime = -1;
                    return;
                }

                if (lastUpdateTime === -1) {
                    lastUpdateTime = performance.now();
                }

                const now = performance.now();
                const delta = now - lastUpdateTime;
                lastUpdateTime = now;
                accumulator += delta;

                if (!this.gameMap.isMain) {
                    const tickDelta = 1000 / 3;
                    while (accumulator > tickDelta) {
                        this.updateTick(payload);
                        accumulator -= tickDelta;
                    }
                    return;
                }

                const isMaxTPS = this.updateSpeedLevel === 10;
                const isCustomTPS = this.updateSpeedLevel === 0;

                if (previousSpeed !== this.updateSpeedLevel) {
                    accumulator = 0;
                    previousSpeed = this.updateSpeedLevel;
                }

                const skip = [
                    1000 / 1,
                    1000 / 3,
                    1000 / 12,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                    1000 / 60,
                ][this.updateSpeedLevel];
                const perUpdateTicks = [
                    1, 1, 1, 1, 5, 20, 100, 500, 2000, 10000, 0,
                ][this.updateSpeedLevel];

                const tickSpeed = [
                    0, 3, 12, 60, 300, 1200, 6000, 30000, 120000, 600000, 0,
                ][this.updateSpeedLevel];

                const UPDATE_BUDGET = 1000 / 30;

                if (this.gameMap.graph.engine.isChanged()) {
                    const breakMode = EnableBreakpointSetting.value;
                    const isBreakEnabled = breakMode !== BreakpointMode.OFF;
                    const startTick = this.gameMap.graph.engine.getTick();
                    if (isMaxTPS) {
                        const frameBudget = 1000 / TargetFPSSetting.value;

                        const browserOverhead = Math.max(4, frameBudget * 0.12);

                        const timeLimit =
                            performance.now() +
                            frameBudget -
                            Math.min(renderDelta, frameBudget / 2) -
                            browserOverhead;

                        let currentTime = performance.now();
                        let breakPoint = false;

                        while (
                            currentTime < timeLimit - 0.5 &&
                            (!breakPoint || !isBreakEnabled)
                        ) {
                            const remainingTime = timeLimit - currentTime;

                            const currentBatch = Math.max(
                                5,
                                Math.min(adaptiveBatchSize, 100000),
                            );

                            const startBatch = performance.now();

                            payload();
                            breakPoint =
                                this.gameMap.graph.engine.runManyTicks(
                                    currentBatch,
                                );

                            const endBatch = performance.now();
                            const elapsed = endBatch - startBatch;

                            currentTime = endBatch;

                            if (elapsed > 0.5) {
                                const singleTickDuration =
                                    elapsed / currentBatch;

                                const predictedTicks = Math.floor(
                                    (remainingTime * 0.8) / singleTickDuration,
                                );

                                const maxGrowth = currentBatch * 1.5;
                                adaptiveBatchSize = Math.floor(
                                    Math.max(
                                        5,
                                        Math.min(predictedTicks, maxGrowth),
                                    ),
                                );
                            } else {
                                adaptiveBatchSize = Math.floor(
                                    Math.max(
                                        5,
                                        Math.min(
                                            adaptiveBatchSize * 1.5,
                                            100000,
                                        ),
                                    ),
                                );
                            }
                        }

                        accumulator = 0;
                    } else if (TPSOverloadSetting.value || isCustomTPS) {
                        const targetTPS = isCustomTPS
                            ? this.customTPS
                            : tickSpeed;
                        const customSkipDelta = 1000 / targetTPS;
                        const customSkip = Math.max(customSkipDelta, 1000 / 60);
                        if (accumulator >= customSkip) {
                            payload();
                            let runTicks = Math.floor(
                                accumulator / customSkipDelta,
                            );
                            const maxTickBatch =
                                Math.round(targetTPS / 60 / 100) + 1;
                            const startTime = performance.now();
                            let breakPoint = false;
                            while (
                                performance.now() - startTime < UPDATE_BUDGET &&
                                runTicks > 0 &&
                                (!breakPoint || !isBreakEnabled)
                            ) {
                                const tickBatch = Math.min(
                                    runTicks,
                                    maxTickBatch,
                                );
                                breakPoint =
                                    this.gameMap.graph.engine.runManyTicks(
                                        tickBatch,
                                    );
                                accumulator -= tickBatch * customSkipDelta;
                                runTicks -= tickBatch;
                            }
                        }
                    } else {
                        let breakPoint = false;
                        while (
                            accumulator >= skip &&
                            (!breakPoint || !isBreakEnabled)
                        ) {
                            payload();
                            breakPoint =
                                this.gameMap.graph.engine.runManyTicks(
                                    perUpdateTicks,
                                );
                            accumulator -= skip;
                        }
                    }
                    if (isBreakEnabled) {
                        const breakpointIdx =
                            this.gameMap.graph.engine.getBreakpoint(true);
                        if (breakpointIdx !== false) {
                            this.playing = false;
                            uiPauseSign.val?.setVisibility(true);
                            if (breakMode === BreakpointMode.ON_ZOOM) {
                                const breakpointNode =
                                    this.gameMap.graph.getNode(breakpointIdx);
                                this.focusOnCell(
                                    breakpointNode.globalX,
                                    breakpointNode.globalY,
                                    1 / 30,
                                );
                            }
                        }
                    }
                    const endTick = this.gameMap.graph.engine.getTick();
                    const deltaTicks = endTick - startTick;
                    _this.tick += deltaTicks;
                    _this.updatesPerSecond += deltaTicks;
                } else {
                    accumulator = 0;
                }

                if (performance.now() - _this.updateTime > 1000) {
                    _this.updateTime = performance.now();
                    _this.tps = _this.updatesPerSecond;
                    _this.updatesPerSecond = 0;
                }
                this.onFPSUpdate();
            }
        };
    });
};
