import {RootNode} from "../rootNode";
import {ASTNode} from "../astNode";
import {ASTNodeType} from "../astNodeType";

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
                (node.type === ASTNodeType.DETECTOR && node.specialNode === undefined) ||
                (node.type === ASTNodeType.BLOCKER && node.allEdges.length === 0)) {
                for (let i = 0; i < node.allEdges.length; i++) {
                    const edge = node.allEdges[i];
                    visited.delete(edge);
                }
                node.remove();
            } else if ((node.type === ASTNodeType.LOGIC_XOR && node.backEdges.length < 2) ||
                (node.type === ASTNodeType.BLOCKER && node.specialNode === undefined)) {
                node.type = ASTNodeType.PATH;
            } else if (node.type === ASTNodeType.DETECTOR && node.specialNode!.type !== ASTNodeType.IMPULSE && node.specialNode!.type !== ASTNodeType.DELAY) {
                const detectedNode = node.specialNode!;
                node.removeFromArray(detectedNode.detectors);
                node.specialNode = undefined;
                node.type = ASTNodeType.PATH;
                detectedNode.edges.push(node);
            }
        }
    }
}