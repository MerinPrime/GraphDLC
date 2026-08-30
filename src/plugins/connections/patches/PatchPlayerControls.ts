import type { KeyboardHandler } from '@logic-arrows/controls/keyboard-handler';
import type { Arrow } from '@logic-arrows/game-logic/arrow';
import type { Game } from '@logic-arrows/player/game';
import type { PlayerControls } from '@logic-arrows/player/player-controls';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { GraphNode } from 'src/core/graph/ast/GraphNode';
import { NodeType } from 'src/core/graph/engines/core/NodeType';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import type { HighlightPathData } from './types';

interface PrivatePlayerControls {
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
            return class PlayerControls extends _module {
                private highlightPathData: HighlightPathData | null = null;

                public update(): void {
                    super.update();

                    const _this = this as any as PrivatePlayerControls;

                    if (
                        _this.keyboardHandler.getKeyPressed('AltLeft') ||
                        _this.keyboardHandler.getKeyPressed('AltRight')
                    ) {
                        const arrow: Arrow | undefined =
                            _this.getArrowByMousePosition();
                        if (!arrow) {
                            this.resetPathData();
                            return;
                        }

                        const nodeIdx = arrow.astIndex;
                        if (nodeIdx === undefined || nodeIdx === null) {
                            this.resetPathData();
                            return;
                        }

                        const graph = _this.game.gameMap.graph;
                        const node = graph.getNode(nodeIdx);
                        if (!node) {
                            this.resetPathData();
                            return;
                        }

                        if (this.highlightPathData?.node === node) {
                            return;
                        }
                        this.updatePathData(node);
                    } else {
                        this.resetPathData();
                    }
                }

                public resetPathData() {
                    const _this = this as any as PrivatePlayerControls;
                    this.highlightPathData = null;
                    _this.game.highlightPathData = null;
                }

                public updatePathData(node: GraphNode) {
                    if (this.highlightPathData === null) {
                        this.highlightPathData = {
                            node,
                            path: [],
                            input: [],
                            output: [],
                        };
                    }

                    this.highlightPathData.node = node;

                    const fullPath = new Set<GraphNode>();
                    const forwardQueue = [node];
                    const backwardQueue = [node];

                    while (backwardQueue.length > 0) {
                        const node = backwardQueue.pop();
                        if (!node) break;
                        const x = node.backLinks.filter(
                            (x) =>
                                (x.type === NodeType.PATH ||
                                    x.type === NodeType.DETECTOR) &&
                                !fullPath.has(x),
                        );
                        x.forEach((y) => {
                            fullPath.add(y);
                        });
                        forwardQueue.push(...x);
                        backwardQueue.push(...x);
                    }
                    while (forwardQueue.length > 0) {
                        const node = forwardQueue.pop();
                        if (!node) break;
                        const x = node.links.filter(
                            (x) =>
                                (x.type === NodeType.PATH ||
                                    x.type === NodeType.DETECTOR) &&
                                !fullPath.has(x),
                        );
                        x.forEach((y) => {
                            fullPath.add(y);
                        });
                        forwardQueue.push(...x);
                    }
                    fullPath.add(node);

                    const input = new Set<GraphNode>();
                    const output = new Set<GraphNode>();

                    fullPath.forEach((node) => {
                        node.backLinks.forEach((link) => {
                            if (!fullPath.has(link)) input.add(link);
                        });
                        node.links.forEach((link) => {
                            if (input.has(link)) {
                                input.delete(link);
                                fullPath.add(link);
                            } else if (!fullPath.has(link)) output.add(link);
                        });
                    });

                    this.highlightPathData.path = [...fullPath];
                    this.highlightPathData.input = [...input];
                    this.highlightPathData.output = [...output];

                    const _this = this as any as PrivatePlayerControls;
                    _this.game.highlightPathData = this.highlightPathData;
                }
            };
        },
    );
};
