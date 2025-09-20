import {ASTNode} from "../astNode";
import {RootNode} from "../rootNode";
import {ASTNodeType} from "../astNodeType";

export class BranchOptimizer {
    optimizeBranches(rootNode: RootNode) {
        const visited = new Set<ASTNode>();
        const nodeQueue: ASTNode[] = [rootNode];

        while (nodeQueue.length > 0) {
            const node = nodeQueue.shift()!;
            if (visited.has(node)) {
                continue;
            }
            visited.add(node);
            if (!node.skipOptimization) {
                if (node.arrows.length !== 0) {
                    const validNodes = [];
                    const logicSet = new Set();
                    for (let i = 0; i < node.allEdges.length; i++) {
                        const edge = node.allEdges[i];
                        if (edge.backEdges.some((x) => x.type === ASTNodeType.BLOCKER)) {
                            continue;
                        }
                        const logicEdges = edge.allEdges.filter((x) => x.type.isLogic);
                        if (logicEdges.some((x) => logicSet.has(x))) {
                            continue;
                        }
                        logicEdges.forEach((x) => logicSet.add(x));
                        if (edge.type === ASTNodeType.PATH) {
                            validNodes.push(edge);
                        }
                    }
                    if (validNodes.length >= 2) {
                        const mustBeBackEdges = new Set(validNodes[0].backEdges);
                        let isValid = true;
                        for (let i = 0; i < validNodes.length && isValid; i++) {
                            const validNode = validNodes[i];
                            if (validNode.backEdges.length !== mustBeBackEdges.size) {
                                isValid = false;
                                break
                            }
                            for (let j = 0; j < validNode.backEdges.length; j++) {
                                const backEdge = validNode.backEdges[j];
                                if (!mustBeBackEdges.has(backEdge)) {
                                    isValid = false;
                                }
                            }
                        }
                        if (isValid) {
                            const newNode = new ASTNode().combine(validNodes);
                            newNode.isBranch = true;
                            node.allEdges.push(newNode);
                            node.edges.push(newNode);
                            node.filterDuplicates();
                            for (let i = 0; i < newNode.allEdges.length; i++) {
                                const edge = newNode.allEdges[i];
                                edge.filterDuplicates();
                            }
                        }
                    }
                }
            }
            nodeQueue.push(...node.allEdges);
        }
    }
}
