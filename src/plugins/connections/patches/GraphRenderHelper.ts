import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { GameRender } from '@logic-arrows/game-render/game-render';
import type { Render } from '@logic-arrows/render-engine/render';
import type { Shader } from '@logic-arrows/render-engine/shader';
import type { GraphNode } from 'src/core/graph/ast/GraphNode';
import { NodeType } from 'src/core/graph/engines/core/NodeType';
import { ArrowType } from 'src/core/utils/ArrowType';
import type { HighlightPathData } from './types';

export type ColorRGBA = [number, number, number, number];

export const PATH_COLOR: ColorRGBA = [0.85, 0.15, 0.75, 0.32];
export const BRANCH_COLOR: ColorRGBA = [0.1, 0.75, 0.85, 0.28];
export const SAME_TIMING_COLOR: ColorRGBA = [1.0, 0.84, 0.0, 0.35];
export const OUTPUT_COLOR: ColorRGBA = [0.15, 0.85, 0.3, 0.3];
export const INPUT_COLOR: ColorRGBA = [0.95, 0.2, 0.2, 0.3];
export const NEXT_YELLOW_COLOR: ColorRGBA = [1.0, 0.84, 0.0, 0.3];
export const CENTER_HOVER_COLOR: ColorRGBA = [0.2, 0.5, 1.0, 0.32];
export const SKIPPED_NODE_COLOR: ColorRGBA = [0.15, 0.15, 0.18, 0.55];

const CONN_RIGHT = 1;
const CONN_LEFT = 2;
const CONN_DOWN = 4;
const CONN_UP = 8;

const SIZE_FACTOR = 0.6;
const PAD_FACTOR = (1.0 - SIZE_FACTOR) * 0.5;

const PARALLELOGRAM_VERT = `#version 300 es
precision highp float;

in vec2 a_position;

uniform vec2 u_origin;
uniform vec2 u_edge1;
uniform vec2 u_edge2;
uniform vec2 u_resolution;

void main() {
  vec2 pos = u_origin + a_position.x * u_edge1 + a_position.y * u_edge2;
  vec2 clip_space = (pos / u_resolution) * 2.0 - 1.0;
  clip_space.y = -clip_space.y;
  gl_Position = vec4(clip_space, 0.0, 1.0);
}
`;

const PARALLELOGRAM_FRAG = `#version 300 es
precision highp float;

uniform vec4 u_color;
out vec4 out_color;

void main() {
  out_color = u_color;
}
`;

interface NodeRenderItem {
    node: GraphNode;
    color: ColorRGBA;
    connMask: number;
}

interface DiagonalBridge {
    fromNode: GraphNode;
    toNode: GraphNode;
    dy: number;
    color: ColorRGBA;
}

interface StraightBridge {
    midX: number;
    midY: number;
    horizontal: boolean;
    color: ColorRGBA;
}

export class GraphRenderHelper {
    private parallelogramShader: Shader | null = null;

    private cachedNode: GraphNode | null = null;
    private cachedGraphUpdate: number = -1;
    private cachedNodes: NodeRenderItem[] = [];
    private cachedDiagonalBridges: DiagonalBridge[] = [];
    private cachedStraightBridges: StraightBridge[] = [];

    private initShaders(render: Render): boolean {
        if (this.parallelogramShader) return true;

        try {
            this.parallelogramShader = render.compileShader(
                PARALLELOGRAM_VERT,
                PARALLELOGRAM_FRAG,
            );
            return true;
        } catch (e) {
            console.error('Failed to compile parallelogram shader:', e);
            return false;
        }
    }

    public renderPath(
        gameRender: GameRender,
        _gameMap: GameMap,
        pathData: HighlightPathData,
        offsetX: number,
        offsetY: number,
        scale: number,
    ): void {
        const render: Render = gameRender.render;
        if (!this.initShaders(render)) return;

        if (
            this.cachedNode !== pathData.node ||
            this.cachedGraphUpdate !== pathData.lastGraphUpdate
        ) {
            this.cachedNode = pathData.node;
            this.cachedGraphUpdate = pathData.lastGraphUpdate;
            this.cachedNodes = [];
            this.cachedDiagonalBridges = [];
            this.cachedStraightBridges = [];

            const nodeMap = new Map<GraphNode, ColorRGBA>();

            for (const node of pathData.output) nodeMap.set(node, OUTPUT_COLOR);
            for (const node of pathData.input) nodeMap.set(node, INPUT_COLOR);
            for (const node of pathData.branches)
                nodeMap.set(node, BRANCH_COLOR);
            for (const node of pathData.path) nodeMap.set(node, PATH_COLOR);
            for (const node of pathData.sameNodes) {
                nodeMap.set(node, SAME_TIMING_COLOR);
            }

            const coordNodeMap = new Map<string, GraphNode>();
            for (const node of nodeMap.keys()) {
                coordNodeMap.set(`${node.globalX}_${node.globalY}`, node);
            }

            interface RawGraphLink {
                from: GraphNode;
                to: GraphNode;
                fromColor: ColorRGBA;
                toColor: ColorRGBA;
            }
            const allLinks: RawGraphLink[] = [];

            for (const [node, color] of nodeMap) {
                for (let j = 0; j < node.linksList.length; j++) {
                    const linked = node.linksList.nodes[j];
                    if (linked.type === NodeType.EMPTY) continue;
                    if (
                        linked.type === NodeType.DETECTOR &&
                        linked.detectedLink !== node
                    ) {
                        continue;
                    }

                    const targetColor = nodeMap.get(linked);
                    if (!targetColor) continue;

                    allLinks.push({
                        from: node,
                        to: linked,
                        fromColor: color,
                        toColor: targetColor,
                    });
                }
            }

            const connMaskMap = new Map<GraphNode, number>();
            const connectAdjacent = (n1: GraphNode, n2: GraphNode) => {
                const dx = n2.globalX - n1.globalX;
                const dy = n2.globalY - n1.globalY;
                if (Math.abs(dx) + Math.abs(dy) !== 1) return;

                const m1 = connMaskMap.get(n1) || 0;
                const m2 = connMaskMap.get(n2) || 0;
                if (dx === 1) {
                    connMaskMap.set(n1, m1 | CONN_RIGHT);
                    connMaskMap.set(n2, m2 | CONN_LEFT);
                } else if (dx === -1) {
                    connMaskMap.set(n1, m1 | CONN_LEFT);
                    connMaskMap.set(n2, m2 | CONN_RIGHT);
                } else if (dy === 1) {
                    connMaskMap.set(n1, m1 | CONN_DOWN);
                    connMaskMap.set(n2, m2 | CONN_UP);
                } else if (dy === -1) {
                    connMaskMap.set(n1, m1 | CONN_UP);
                    connMaskMap.set(n2, m2 | CONN_DOWN);
                }
            };

            const setDirectionConn = (
                n: GraphNode,
                dirX: number,
                dirY: number,
            ) => {
                const m = connMaskMap.get(n) || 0;
                if (dirX === 1) connMaskMap.set(n, m | CONN_RIGHT);
                else if (dirX === -1) connMaskMap.set(n, m | CONN_LEFT);
                else if (dirY === 1) connMaskMap.set(n, m | CONN_DOWN);
                else if (dirY === -1) connMaskMap.set(n, m | CONN_UP);
            };

            const drawnDiagonalPairs = new Set<string>();
            const drawnStraightBridges = new Set<string>();

            for (let i = 0; i < allLinks.length; i++) {
                const link = allLinks[i];
                const dx = link.to.globalX - link.from.globalX;
                const dy = link.to.globalY - link.from.globalY;

                if (Math.abs(dx) + Math.abs(dy) === 1) {
                    connectAdjacent(link.from, link.to);
                } else if (
                    (Math.abs(dx) === 2 && dy === 0) ||
                    (dx === 0 && Math.abs(dy) === 2)
                ) {
                    const stepX = dx / 2;
                    const stepY = dy / 2;
                    const midX = link.from.globalX + stepX;
                    const midY = link.from.globalY + stepY;
                    const midArrow = _gameMap.getArrow(midX, midY);

                    if (midArrow && midArrow.type !== ArrowType.EMPTY) {
                        let midNode = coordNodeMap.get(`${midX}_${midY}`);
                        if (!midNode) {
                            if (midArrow.astIndex != null) {
                                midNode = _gameMap.graph.getNode(
                                    midArrow.astIndex,
                                );
                            }
                            if (!midNode) {
                                midNode = {
                                    globalX: midX,
                                    globalY: midY,
                                } as GraphNode;
                            }
                            coordNodeMap.set(`${midX}_${midY}`, midNode);
                            nodeMap.set(midNode, SKIPPED_NODE_COLOR);
                        } else if (
                            midNode !== pathData.node &&
                            !pathData.path.includes(midNode) &&
                            !pathData.branches.includes(midNode) &&
                            !pathData.output.includes(midNode) &&
                            !pathData.input.includes(midNode)
                        ) {
                            nodeMap.set(midNode, SKIPPED_NODE_COLOR);
                        }

                        connectAdjacent(link.from, midNode);
                        connectAdjacent(midNode, link.to);
                    } else {
                        setDirectionConn(link.from, stepX, stepY);
                        setDirectionConn(link.to, -stepX, -stepY);

                        const bridgeKey = `${midX}_${midY}`;
                        if (!drawnStraightBridges.has(bridgeKey)) {
                            drawnStraightBridges.add(bridgeKey);
                            this.cachedStraightBridges.push({
                                midX,
                                midY,
                                horizontal: dx !== 0,
                                color: [
                                    (link.fromColor[0] + link.toColor[0]) * 0.5,
                                    (link.fromColor[1] + link.toColor[1]) * 0.5,
                                    (link.fromColor[2] + link.toColor[2]) * 0.5,
                                    (link.fromColor[3] + link.toColor[3]) * 0.5,
                                ],
                            });
                        }
                    }
                } else if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
                    const isFromFirst =
                        link.from.globalX < link.to.globalX ||
                        (link.from.globalX === link.to.globalX &&
                            link.from.globalY < link.to.globalY);

                    const fromNode = isFromFirst ? link.from : link.to;
                    const toNode = isFromFirst ? link.to : link.from;
                    const pairKey = `${fromNode.nodeIdx}_${toNode.nodeIdx}`;

                    if (!drawnDiagonalPairs.has(pairKey)) {
                        drawnDiagonalPairs.add(pairKey);
                        this.cachedDiagonalBridges.push({
                            fromNode,
                            toNode,
                            dy: toNode.globalY - fromNode.globalY,
                            color: [
                                (link.fromColor[0] + link.toColor[0]) * 0.5,
                                (link.fromColor[1] + link.toColor[1]) * 0.5,
                                (link.fromColor[2] + link.toColor[2]) * 0.5,
                                (link.fromColor[3] + link.toColor[3]) * 0.5,
                            ],
                        });
                    }
                }
            }

            for (const [node, color] of nodeMap) {
                this.cachedNodes.push({
                    node,
                    color,
                    connMask: connMaskMap.get(node) || 0,
                });
            }
        }

        if (this.cachedNodes.length === 0) return;

        const width = gameRender.canvas.width;
        const height = gameRender.canvas.height;
        const margin = 2;
        const minCellX = Math.floor(-offsetX / scale) - margin;
        const maxCellX = Math.ceil((-offsetX + width) / scale) + margin;
        const minCellY = Math.floor(-offsetY / scale) - margin;
        const maxCellY = Math.ceil((-offsetY + height) / scale) + margin;

        const visibleNodes: NodeRenderItem[] = [];
        for (let i = 0; i < this.cachedNodes.length; i++) {
            const item = this.cachedNodes[i];
            const gx = item.node.globalX;
            const gy = item.node.globalY;
            if (
                gx < minCellX ||
                gx > maxCellX ||
                gy < minCellY ||
                gy > maxCellY
            ) {
                continue;
            }
            visibleNodes.push(item);
        }

        const visibleStraightBridges: StraightBridge[] = [];
        for (let i = 0; i < this.cachedStraightBridges.length; i++) {
            const b = this.cachedStraightBridges[i];
            if (
                b.midX < minCellX ||
                b.midX > maxCellX ||
                b.midY < minCellY ||
                b.midY > maxCellY
            ) {
                continue;
            }
            visibleStraightBridges.push(b);
        }

        const visibleDiagonalBridges: DiagonalBridge[] = [];
        for (let i = 0; i < this.cachedDiagonalBridges.length; i++) {
            const b = this.cachedDiagonalBridges[i];
            const minX = Math.min(b.fromNode.globalX, b.toNode.globalX);
            const maxX = Math.max(b.fromNode.globalX, b.toNode.globalX);
            const minY = Math.min(b.fromNode.globalY, b.toNode.globalY);
            const maxY = Math.max(b.fromNode.globalY, b.toNode.globalY);

            if (
                maxX < minCellX ||
                minX > maxCellX ||
                maxY < minCellY ||
                minY > maxCellY
            ) {
                continue;
            }
            visibleDiagonalBridges.push(b);
        }

        this.drawGraph(
            gameRender,
            visibleNodes,
            visibleStraightBridges,
            visibleDiagonalBridges,
            offsetX,
            offsetY,
            scale,
        );
    }

    private drawGraph(
        gameRender: GameRender,
        nodes: NodeRenderItem[],
        straightBridges: StraightBridge[],
        diagonalBridges: DiagonalBridge[],
        offsetX: number,
        offsetY: number,
        scale: number,
    ): void {
        const render = gameRender.render;
        render.setBlendMode('alpha');

        const pad = scale * PAD_FACTOR;
        const coreSize = scale * SIZE_FACTOR;

        for (let i = 0; i < straightBridges.length; i++) {
            const b = straightBridges[i];
            gameRender.setSolidColor(
                b.color[0],
                b.color[1],
                b.color[2],
                b.color[3],
            );
            if (b.horizontal) {
                gameRender.drawSolidColorRect(
                    b.midX * scale + offsetX,
                    b.midY * scale + offsetY + pad,
                    scale,
                    coreSize,
                );
            } else {
                gameRender.drawSolidColorRect(
                    b.midX * scale + offsetX + pad,
                    b.midY * scale + offsetY,
                    coreSize,
                    scale,
                );
            }
        }

        if (diagonalBridges.length > 0 && this.parallelogramShader) {
            const width = gameRender.canvas.width;
            const height = gameRender.canvas.height;

            render.setShader(this.parallelogramShader);
            this.parallelogramShader.uniform2f('u_resolution', width, height);

            for (let i = 0; i < diagonalBridges.length; i++) {
                const b = diagonalBridges[i];
                const fromX = b.fromNode.globalX * scale + offsetX;
                const fromY = b.fromNode.globalY * scale + offsetY;

                const originY =
                    b.dy === 1 ? fromY + pad + coreSize : fromY + pad;
                const edge2Y = b.dy * 2 * pad;

                this.parallelogramShader.uniform2f(
                    'u_origin',
                    fromX + pad,
                    originY,
                );
                this.parallelogramShader.uniform2f('u_edge1', coreSize, 0);
                this.parallelogramShader.uniform2f('u_edge2', scale, edge2Y);
                this.parallelogramShader.uniform4f(
                    'u_color',
                    b.color[0],
                    b.color[1],
                    b.color[2],
                    b.color[3],
                );
                render.drawQuad();
            }

            render.gl.bindVertexArray(null);
        }

        for (let i = 0; i < nodes.length; i++) {
            const { node, color, connMask } = nodes[i];
            const x0 = node.globalX * scale + offsetX;
            const y0 = node.globalY * scale + offsetY;

            gameRender.setSolidColor(color[0], color[1], color[2], color[3]);

            gameRender.drawSolidColorRect(
                x0 + pad,
                y0 + pad,
                coreSize,
                coreSize,
            );

            if (connMask & CONN_RIGHT) {
                gameRender.drawSolidColorRect(
                    x0 + pad + coreSize,
                    y0 + pad,
                    pad,
                    coreSize,
                );
            }
            if (connMask & CONN_LEFT) {
                gameRender.drawSolidColorRect(x0, y0 + pad, pad, coreSize);
            }
            if (connMask & CONN_DOWN) {
                gameRender.drawSolidColorRect(
                    x0 + pad,
                    y0 + pad + coreSize,
                    coreSize,
                    pad,
                );
            }
            if (connMask & CONN_UP) {
                gameRender.drawSolidColorRect(x0 + pad, y0, coreSize, pad);
            }
        }
    }
}
