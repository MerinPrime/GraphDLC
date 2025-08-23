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
                    if (edge.back.some((x) => x.type === ASTNodeType.BLOCKER)) {
                        continue;
                    }
                    if (edge.type === ASTNodeType.PATH || edge.type === ASTNodeType.DETECTOR) {
                        validNodes.push(edge);
                    } else if (edge.type === ASTNodeType.LOGIC_XOR && edge.back.length === 1) {
                        validNodes.push(edge);
                    }
                }
                if (validNodes.length >= 2) {
                    const mustBeBackEdges = new Set(validNodes[0].back);
                    let isValid = true;
                    for (let i = 0; i < validNodes.length && isValid; i++) {
                        const validNode = validNodes[i];
                        if (validNode.back.length !== mustBeBackEdges.size) {
                            isValid = false;
                            break
                        }
                        for (let j = 0; j < validNode.back.length; j++) {
                            const backEdge = validNode.back[j];
                            if (!mustBeBackEdges.has(backEdge)) {
                                isValid = false;
                            }
                        }
                    }
                    if (isValid) {
                        const newNode = new ASTNode().combine(validNodes).filterDuplicates();
                        newNode.isBranch = true;
                        for (let i = 0; i < validNodes.length; i++) {
                            validNodes[i].remove();
                        }
                        node.allEdges.push(newNode);
                        node.edges.push(newNode);
                        node.filterDuplicates();
                        const removeAsDetectorIndex = node.detectors.indexOf(newNode);
                        if (removeAsDetectorIndex !== -1) node.detectors.splice(removeAsDetectorIndex, 1);
                        for (let i = 0; i < newNode.allEdges.length; i++) {
                            const edge = newNode.allEdges[i];
                            edge.filterDuplicates();
                        }
                    }
                }
            }
            // BACKWARD
            if (node.arrows.length !== 0) {
                const validNodes = [];
                for (let i = 0; i < node.back.length; i++) {
                    const edge = node.back[i];
                    if (edge.back.some((x) => x.type === ASTNodeType.BLOCKER)) {
                        continue;
                    }
                    if (edge.type === ASTNodeType.PATH || edge.type === ASTNodeType.DETECTOR) {
                        validNodes.push(edge);
                    } else if (edge.type === ASTNodeType.LOGIC_XOR && edge.back.length === 1) {
                        validNodes.push(edge);
                    }
                }
                if (validNodes.length >= 2) {
                    const mustBeEdges = new Set(validNodes[0].allEdges);
                    let isValid = true;
                    for (let i = 0; i < validNodes.length && isValid; i++) {
                        const validNode = validNodes[i];
                        if (validNode.allEdges.length !== mustBeEdges.size) {
                            isValid = false;
                            break
                        }
                        for (let j = 0; j < validNode.allEdges.length; j++) {
                            const edge = validNode.allEdges[j];
                            if (!mustBeEdges.has(edge)) {
                                isValid = false;
                            }
                        }
                    }
                    if (isValid) {
                        const newNode = new ASTNode().combine(validNodes).filterDuplicates();
                        newNode.isBranch = true;
                        for (let i = 0; i < validNodes.length; i++) {
                            validNodes[i].remove();
                        }
                        node.back.push(newNode);
                        node.filterDuplicates();
                        for (let i = 0; i < newNode.back.length; i++) {
                            const edge = newNode.back[i];
                            edge.filterDuplicates();
                            visited.delete(edge);
                            nodeQueue.push(edge);
                        }
                    }
                }
            }
            nodeQueue.push(...node.allEdges);
        }
    }
}