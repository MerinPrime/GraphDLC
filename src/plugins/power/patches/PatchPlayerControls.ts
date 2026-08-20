import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Game } from '@logic-arrows/player/game';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { GraphNode } from 'src/core/graph/ast/GraphNode';
import { NodeSignal } from 'src/core/graph/engines/core/NodeSignal';
import { NodeType } from 'src/core/graph/engines/core/NodeType';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

interface PrivatePlayerControls {
    readonly playerUI: PlayerUI;
    readonly game: Game;
    readonly keyboardHandler: KeyboardHandler;

    getArrowByMousePosition(): Arrow | undefined;
}

export const PatchPlayerControls: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'PlayerControls',
        (_module: typeof PlayerControls) => {
            // @ts-expect-error
            return class PlayerControls extends _module {
                private arrowSignalStarted: boolean = false;
                private startArrowSignal: NodeSignal = NodeSignal.NONE;
                private processedArrows: Set<number> = new Set();

                public trySetNodeSignal(node: GraphNode, doClear: boolean) {
                    if (node.type === NodeType.EMPTY) return;

                    const engine = (this as any as PrivatePlayerControls).game
                        .gameMap.graph.engine;

                    if (doClear) {
                        engine.setNodeSignal(node.nodeIdx, NodeSignal.NONE);
                        return;
                    }

                    const isDelayOrImpulse =
                        node.type === NodeType.DELAY ||
                        node.type === NodeType.IMPULSE;

                    if (!this.arrowSignalStarted) {
                        this.startArrowSignal = this.computeInitialSignal(
                            engine,
                            node,
                            isDelayOrImpulse,
                        );
                    }

                    const targetSignal =
                        !isDelayOrImpulse &&
                        this.startArrowSignal === NodeSignal.PENDING
                            ? NodeSignal.ACTIVE
                            : this.startArrowSignal;

                    engine.setNodeSignal(node.nodeIdx, targetSignal);
                }

                private computeInitialSignal(
                    engine: any,
                    node: GraphNode,
                    isDelayOrImpulse: boolean,
                ): NodeSignal {
                    if (!isDelayOrImpulse) return NodeSignal.ACTIVE;

                    const currentSignal = engine.getNodeSignal(node.nodeIdx);

                    if (currentSignal === NodeSignal.ACTIVE)
                        return NodeSignal.PENDING;
                    if (currentSignal === NodeSignal.PENDING)
                        return NodeSignal.ACTIVE;

                    return node.type === NodeType.DELAY
                        ? NodeSignal.PENDING
                        : NodeSignal.ACTIVE;
                }

                public update(): void {
                    super.update();

                    const _this = this as any as PrivatePlayerControls;

                    if (_this.keyboardHandler.getKeyPressed('KeyP')) {
                        const arrow = _this.getArrowByMousePosition();
                        const nodeIdx = arrow?.astIndex;

                        if (nodeIdx === undefined || nodeIdx == null) return;

                        if (this.processedArrows.has(nodeIdx)) {
                            const engine = _this.game.gameMap.graph.engine;
                            const signal = engine.getNodeSignal(nodeIdx);
                            if (signal !== NodeSignal.NONE) {
                                return;
                            }
                        } else {
                            this.processedArrows.add(nodeIdx);
                        }

                        const node = _this.game.gameMap.graph.getNode(nodeIdx);
                        const doClear = _this.keyboardHandler.getShiftPressed();
                        this.trySetNodeSignal(node, doClear);
                        this.arrowSignalStarted = true;
                        return;
                    } else if (this.arrowSignalStarted) {
                        this.processedArrows.clear();
                        this.arrowSignalStarted = false;
                    }
                }

                public clearSignals() {
                    // @ts-expect-error
                    super.clearSignals();
                    const _this = this as any as PrivatePlayerControls;
                    _this.playerUI.startTickFrom = 0;
                }
            };
        },
    );
};
