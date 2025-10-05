import {RootNode} from "../rootNode";
import {ASTNode} from "../astNode";
import {ASTNodeType} from "../astNodeType";
import {removeWithSwap} from "../../utility/removeWithSwap";

export class SimpleOptimizer {
    optimizeSimple(rootNode: RootNode) {
        const visited = new Set<ASTNode>();
        const nodeQueue: ASTNode[] = [...rootNode.allEdges];
        
        while (nodeQueue.length > 0) {
            const node = nodeQueue.shift()!;
            if (visited.has(node)) {
                continue;
            }
            visited.add(node);
            nodeQueue.push(...node.allEdges);

            if ((node.type === ASTNodeType.LOGIC_AND || node.type === ASTNodeType.LATCH) && node.backEdges.length < 2 ||
                (!node.type.isEntryPoint && node.backEdges.length === 0) ||
                (node.type === ASTNodeType.DETECTOR && node.specialNode === undefined)) {
                for (let i = 0; i < node.allEdges.length; i++) {
                    const edge = node.allEdges[i];
                    visited.delete(edge);
                }
                for (let i = 0; i < node.backEdges.length; i++) {
                    const backEdge = node.backEdges[i];
                    visited.delete(backEdge);
                }
                node.remove();
            } else if ((node.type === ASTNodeType.LOGIC_XOR && node.backEdges.length < 2) ||
                (node.type === ASTNodeType.BLOCKER && node.specialNode === undefined)) {
                node.type = ASTNodeType.PATH;
            } else if (node.type === ASTNodeType.DETECTOR && node.specialNode!.type !== ASTNodeType.IMPULSE && node.specialNode!.type !== ASTNodeType.DELAY) {
                const detectedNode = node.specialNode!;
                removeWithSwap(detectedNode.detectors, node);
                node.specialNode = undefined;
                node.type = ASTNodeType.PATH;
                detectedNode.edges.push(node);
            }
        }
    }
}