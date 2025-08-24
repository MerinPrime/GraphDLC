import {ASTNode} from "../astNode";
import {CycleHeadNode} from "../cycle/cycleHeadNode";
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
            // FORWARD
            if (node.arrows.length !== 0) {
                const validNodes = [];
                for (let i = 0; i < node.allEdges.length; i++) {
                    const edge = node.allEdges[i];
                    if (edge.backEdges.some((x) => x.type === ASTNodeType.BLOCKER)) {
                        continue;
                    }
                    if (edge.allEdges.some((x) => x.type.isLogic)) {
                        continue;
                    }
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
                        // newNode.isBranch = true;
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
            // BACKWARD
            // CURRENTLY BROKEN AND IDK WHY
            // I think we need to check circular edges to fix that
            // if (node.arrows.length !== 0 && node.type === ASTNodeType.PATH) {
            //     const validNodes = [];
            //     for (let i = 0; i < node.backEdges.length; i++) {
            //         const backEdge = node.backEdges[i];
            //         if (backEdge.backEdges.some((x) => x.type === ASTNodeType.BLOCKER)) {
            //             continue;
            //         }
            //         if (backEdge.type === ASTNodeType.PATH) {
            //             validNodes.push(backEdge);
            //         }
            //     }
            //     if (validNodes.length >= 2) {
            //         const mustBeEdges = new Set(validNodes[0].allEdges);
            //         let isValid = true;
            //         for (let i = 0; i < validNodes.length && isValid; i++) {
            //             const validNode = validNodes[i];
            //             if (validNode.allEdges.length !== mustBeEdges.size) {
            //                 isValid = false;
            //                 break
            //             }
            //             for (let j = 0; j < validNode.allEdges.length; j++) {
            //                 const edge = validNode.allEdges[j];
            //                 if (!mustBeEdges.has(edge)) {
            //                     isValid = false;
            //                     break;
            //                 }
            //             }
            //         }
            //         if (isValid) {
            //             const newNode = new ASTNode().combine(validNodes);
            //             newNode.isBranch = true;
            //             node.backEdges.push(newNode);
            //             node.filterDuplicates();
            //         }
            //     }
            // }
            nodeQueue.push(...node.allEdges);
        }
    }
}