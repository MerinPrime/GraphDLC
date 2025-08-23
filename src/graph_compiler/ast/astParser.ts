import {GameMap} from "../../api/game_map";
import {Chunk} from "../../api/chunk";
import {Arrow} from "../../api/arrow";
import {ENTRY_POINTS, EXIST_TYPES, NOT_ALLOWED_TO_CHANGE} from "../handlers";
import {ArrowType} from "../../api/arrow_type";
import {PatchLoader} from "../../core/patchLoader";
import {ASTNode} from "./astNode";
import {RootNode} from "./rootNode";

type ArrowContext = {
    chunk: Chunk;
    arrow: Arrow;
    x: number;
    y: number;
};

export class ASTParser {
    patchLoader: PatchLoader;
    
    constructor(patchLoader: PatchLoader) {
        this.patchLoader = patchLoader;
    }
    
    compileFrom(gameMap: GameMap): RootNode {
        const CHUNK_SIZE = this.patchLoader.getDefinition<number>('CHUNK_SIZE');

        gameMap.chunks.forEach((chunk) => {
            chunk.arrows.forEach((arrow) => {
                arrow.lastSignal = 0;
                arrow.signal = 0;
                arrow.signalsCount = 0;
                arrow.blocked = 0;
                arrow.ast_node = undefined;
            });
        });
        
        const processingStack: Array<ArrowContext> = [];
        gameMap.chunks.forEach((chunk) => {
            for (let y = 0; y < CHUNK_SIZE; y++) {
                for (let x = 0; x < CHUNK_SIZE; x++) {
                    const arrow = chunk.arrows[x + y * CHUNK_SIZE];
                    if (!ENTRY_POINTS.has(arrow.type)) continue;
                    processingStack.push({chunk, arrow, x, y});
                }
            }
        });
        
        const rootNode = new RootNode();
        while (processingStack.length > 0) {
            const { chunk, arrow, x, y } = processingStack.pop()!;

            if (!EXIST_TYPES.has(arrow.type)) {
                console.warn(`Founded arrow with uncommon type: ${arrow.type}`)
                continue;
            }
            
            if (!arrow.ast_node) {
                arrow.ast_node = new ASTNode().makeFromArrow(arrow);
            } else if (arrow.ast_node.linked) continue;
            
            const astNode = arrow.ast_node;
            astNode.linked = true;
            
            if (ENTRY_POINTS.has(arrow.type)) {
                rootNode.allEdges.push(astNode);
            }

            const relations = getArrowRelations(arrow.type);
            for (let i = 0; i < relations.length; i++) {
                const [relativeX, relativeY] = relations[i];

                const edgeData = getRelativeArrow(CHUNK_SIZE, chunk, x, y, arrow.rotation, arrow.flipped, relativeX, relativeY);
                if (!edgeData) continue;

                const [edgeArrow, edgeX, edgeY, edgeChunk] = edgeData;
                if (NOT_ALLOWED_TO_CHANGE.has(edgeArrow.type) && arrow.type !== ArrowType.BLOCKER || edgeArrow.type === ArrowType.EMPTY) {
                    continue;
                }
                if (!EXIST_TYPES.has(edgeArrow.type)) {
                    console.warn(`Founded arrow with uncommon type: ${edgeArrow.type}`)
                    continue;
                }
                if (!edgeArrow.ast_node) {
                    edgeArrow.ast_node = new ASTNode().makeFromArrow(edgeArrow);
                }
                const edgeNode = edgeArrow.ast_node;
                edgeNode.back.push(astNode);
                astNode.allEdges.push(edgeNode);
                astNode.detectors.push(edgeNode);
                
                if (!edgeNode.linked) {
                    processingStack.push({ chunk: edgeChunk, arrow: edgeArrow, x: edgeX, y: edgeY });
                }
            }

            const neighbourRelations = getArrowRelations(ArrowType.SOURCE);
            for (let i = 0; i < neighbourRelations.length; i++) {
                const [relativeX, relativeY] = neighbourRelations[i];

                const edgeData = getRelativeArrow(CHUNK_SIZE, chunk, x, y, arrow.rotation, arrow.flipped, relativeX, relativeY);
                if (!edgeData) continue;

                const [edgeArrow, edgeX, edgeY, edgeChunk] = edgeData;
                if (edgeArrow.type !== ArrowType.DETECTOR) continue;

                const detectData = getRelativeArrow(CHUNK_SIZE, edgeChunk, edgeX, edgeY, edgeArrow.rotation, edgeArrow.flipped, 1, 0);
                if (!detectData) continue;

                const [_, detectX, detectY, detectChunk] = detectData;
                if (detectX === x && detectY === y && detectChunk === chunk) {
                    if (!edgeArrow.ast_node) {
                        edgeArrow.ast_node = new ASTNode().makeFromArrow(edgeArrow);
                    }
                    const detectorNode = edgeArrow.ast_node;
                    detectorNode.back.push(astNode);
                    astNode.allEdges.push(detectorNode);
                    astNode.detectors.push(detectorNode);
                    if (!detectorNode.linked) {
                        processingStack.push({ chunk: edgeChunk, arrow: edgeArrow, x: edgeX, y: edgeY });
                    }
                }
            }
        }
        
        return rootNode;
    }
}

export function getRelativeArrow(
    CHUNK_SIZE: number, chunk: Chunk, x: number, y: number, rotation: number,
    flipped: boolean, forward: number = -1, sideways: number = 0
): [Arrow, number, number, Chunk] | undefined {
    if (flipped) sideways = -sideways;

    let targetX = x;
    let targetY = y;

    switch (rotation) {
        case 0: targetY += forward; targetX += sideways; break;
        case 1: targetX -= forward; targetY += sideways; break;
        case 2: targetY -= forward; targetX -= sideways; break;
        case 3: targetX += forward; targetY -= sideways; break;
    }

    let targetChunk = chunk;
    const dx = Math.floor(targetX / CHUNK_SIZE);
    const dy = Math.floor(targetY / CHUNK_SIZE);

    if (dx !== 0 || dy !== 0) {
        const chunkIndex = (dy + 1) * 3 + (dx + 1);
        const adjacentMap = [7, 0, 1, 6, -1, 2, 5, 4, 3];
        const adjacentIndex = adjacentMap[chunkIndex];

        if (adjacentIndex === -1 || !chunk.adjacentChunks[adjacentIndex]) {
            return undefined;
        }
        targetChunk = chunk.adjacentChunks[adjacentIndex]!;
        targetX %= CHUNK_SIZE;
        targetY %= CHUNK_SIZE;
        if (targetX < 0) targetX += CHUNK_SIZE;
        if (targetY < 0) targetY += CHUNK_SIZE;
    }

    if (!targetChunk) return undefined;

    return [targetChunk.getArrow(targetX, targetY), targetX, targetY, targetChunk];
}

export function getArrowRelations(type: ArrowType): Array<[number, number]> {
    switch (type) {
    case ArrowType.ARROW:
    case ArrowType.BLOCKER:
    case ArrowType.DELAY:
    case ArrowType.DETECTOR:
    case ArrowType.LOGIC_NOT:
    case ArrowType.LOGIC_AND:
    case ArrowType.LOGIC_XOR:
    case ArrowType.LATCH:
    case ArrowType.FLIP_FLOP:
    case ArrowType.RANDOM:
    case ArrowType.DIRECTIONAL_BUTTON:
        return [[-1, 0]];
    case ArrowType.SOURCE:
    case ArrowType.IMPULSE:
    case ArrowType.BUTTON:
        return [[-1, 0], [1, 0], [0, -1], [0, 1]];
    case ArrowType.SPLITTER_UP_DOWN:
        return [[-1, 0], [1, 0]];
    case ArrowType.SPLITTER_UP_RIGHT:
        return [[-1, 0], [0, 1]];
    case ArrowType.SPLITTER_UP_RIGHT_LEFT:
        return [[0, -1], [-1, 0], [0, 1]];
    case ArrowType.BLUE_ARROW:
        return [[-2, 0]];
    case ArrowType.DIAGONAL_ARROW:
        return [[-1, 1]];
    case ArrowType.SPLITTER_UP_UP:
        return [[-1, 0], [-2, 0]];
    case ArrowType.SPLITTER_RIGHT_UP:
        return [[0, 1], [-2, 0]];
    case ArrowType.SPLITTER_UP_DIAGONAL:
        return [[-1, 0], [-1, 1]];
    case ArrowType.EMPTY:
    case ArrowType.LEVEL_SOURCE:
    case ArrowType.LEVEL_TARGET:
    default:
        throw new Error('How did you compile level arrow if its cant be compiled?');
    }
}