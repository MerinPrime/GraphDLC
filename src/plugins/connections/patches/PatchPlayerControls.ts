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
                        if (node.type === NodeType.EMPTY) {
                            this.resetPathData();
                        } else {
                            this.updatePathData(node);
                        }
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
                    const isPathType = (n: GraphNode): boolean =>
                        n.type === NodeType.PATH ||
                        n.type === NodeType.DELAY ||
                        n.type === NodeType.DETECTOR ||
                        n.type === NodeType.DIRECTIONAL_BUTTON ||
                        (n.type === NodeType.LOGIC_XOR &&
                            n.backLinks.length <= 1);

                    const getNodeDelay = (n: GraphNode): number =>
                        n.type === NodeType.DELAY ? 2 : 1;

                    if (this.highlightPathData === null) {
                        this.highlightPathData = {
                            node,
                            path: [],
                            input: [],
                            output: [],
                            sameNodes: [],
                        };
                    }

                    this.highlightPathData.node = node;

                    const fullPath = new Set<GraphNode>([node]);
                    const queue: GraphNode[] = [node];

                    while (queue.length > 0) {
                        const curr = queue.pop();
                        if (!curr) continue;

                        for (let i = 0; i < curr.backLinks.length; i++) {
                            const prev = curr.backLinks[i];
                            if (isPathType(prev) && !fullPath.has(prev)) {
                                fullPath.add(prev);
                                queue.push(prev);
                            }
                        }
                        for (let i = 0; i < curr.links.length; i++) {
                            const next = curr.links[i];
                            if (isPathType(next) && !fullPath.has(next)) {
                                fullPath.add(next);
                                queue.push(next);
                            }
                        }
                    }

                    const input = new Set<GraphNode>();
                    const output = new Set<GraphNode>();
                    const roots: GraphNode[] = [];

                    fullPath.forEach((currNode) => {
                        let hasInternalBacklink = false;

                        for (const link of currNode.backLinks) {
                            if (!fullPath.has(link)) {
                                input.add(link);
                            } else {
                                hasInternalBacklink = true;
                            }
                        }

                        for (const link of currNode.links) {
                            if (!fullPath.has(link)) {
                                output.add(link);
                            }
                        }

                        if (!hasInternalBacklink) {
                            roots.push(currNode);
                        }
                    });

                    const timings = new Map<GraphNode, number>();
                    const timingQueue: GraphNode[] = [];

                    const startNodes = roots.length > 0 ? roots : [node];

                    for (const root of startNodes) {
                        timings.set(root, 1);
                        timingQueue.push(root);
                    }

                    let head = 0;
                    while (head < timingQueue.length) {
                        const curr = timingQueue[head++];
                        const currTiming = timings.get(curr) ?? 1;
                        const delay = getNodeDelay(curr);

                        for (const next of curr.links) {
                            if (fullPath.has(next)) {
                                const nextTiming = currTiming + delay;
                                if (
                                    !timings.has(next) ||
                                    (timings.get(next) ?? 0) > nextTiming
                                ) {
                                    timings.set(next, nextTiming);
                                    timingQueue.push(next);
                                }
                            }
                        }
                    }

                    const targetStartTiming = timings.get(node) ?? 1;
                    const targetDelay = getNodeDelay(node);
                    const targetTicks = new Set<number>();
                    for (let t = 0; t < targetDelay; t++) {
                        targetTicks.add(targetStartTiming + t);
                    }

                    const sameTimingNodes: GraphNode[] = [];

                    fullPath.forEach((n) => {
                        const nStartTiming = timings.get(n) ?? 1;
                        const nDelay = getNodeDelay(n);

                        let hasOverlap = false;
                        for (let t = 0; t < nDelay; t++) {
                            if (targetTicks.has(nStartTiming + t)) {
                                hasOverlap = true;
                                break;
                            }
                        }

                        if (hasOverlap) {
                            sameTimingNodes.push(n);
                            fullPath.delete(n);
                        }
                    });

                    this.highlightPathData.path = Array.from(fullPath);
                    this.highlightPathData.input = Array.from(input);
                    this.highlightPathData.output = Array.from(output);
                    this.highlightPathData.sameNodes = sameTimingNodes;

                    const _this = this as any as PrivatePlayerControls;
                    _this.game.highlightPathData = this.highlightPathData;
                }
            };
        },
    );
};
