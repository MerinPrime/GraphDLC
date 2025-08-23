import {ASTNode} from "../graph_compiler/ast/astNode";
import {RootNode} from "../graph_compiler/ast/rootNode";
import {GameMap} from "../api/game_map";
import {CycleHeadNode} from "../graph_compiler/ast/cycle/cycleHeadNode";
import {ASTNodeType} from "../graph_compiler/ast/astNodeType";
import {getArrowRelations} from "../graph_compiler/ast/astParser";

export class ASTDebugger {
    showDebugSignals(rootNode: RootNode, debugMode: number, gameMap: GameMap) {
        // return;
        switch (debugMode) {
            case 0:
                this.showDebugNodeTypes(rootNode);
                break;
            case 1:
                this.showDebugPropagation(rootNode);
                break;
            case 2:
                this.showDebugDeadNodes(rootNode, gameMap);
                break;
        }
    }

    showDebugNodeTypes(rootNode: RootNode) {
        for (let i = 0; i < rootNode.cycles.length; i++) {
            const cycleData = rootNode.cycles[i];
            for (let j = 0; j < cycleData.cycle.length; j++) {
                const cycleArrow = cycleData.cycle[j];
                cycleArrow.signal = 7;
            }
        }
        
        const visited = new Set<ASTNode>();
        const nodeQueue: ASTNode[] = [rootNode];

        while (nodeQueue.length > 0) {
            const node = nodeQueue.shift()!;
            if (visited.has(node)) {
                continue;
            }
            visited.add(node);
            nodeQueue.push(...node.allEdges);
            if (node.arrows.length === 0) {
                continue;
            }
            let signal = 0;
            if (node instanceof CycleHeadNode) {
                signal = 6;
            } else if (node.isBranch) {
                signal = 2;
            } else if (node.allEdges.some((x) => x.isBranch)) {
                signal = 1;
            } else {
                continue;
            }
            for (let i = 0; i < node.arrows.length; i++) {
                node.arrows[i].signal = signal;
            }
        }
    }

    showDebugDeadNodes(rootNode: RootNode, gameMap: GameMap) {
        for (const value of gameMap.chunks.values()) {
            for (let i = 0; i < value.arrows.length; i++) {
                const arrow = value.arrows[i];
                if (arrow.ast_node === undefined)
                    arrow.signal = 7;
                else
                    arrow.signal = 0;
            }
        }
        const deadNodes = new Set<ASTNode>();
        const visited = new Set<ASTNode>();
        const nodeQueue: ASTNode[] = [rootNode];

        while (nodeQueue.length > 0) {
            const node = nodeQueue.shift()!;
            if (visited.has(node)) {
                continue;
            }
            visited.add(node);

            const allEdges = node.allEdges.filter((x) => !deadNodes.has(x));
            nodeQueue.push(...allEdges);

            if (node.arrows.length === 0) {
                continue;
            }

            let signal: number | null = null;

            const backEdges = node.back.filter((x) => !deadNodes.has(x));
            
            if ((node.type === ASTNodeType.LOGIC_AND || node.type === ASTNodeType.LATCH) && backEdges.length < 2) {
                signal = 6;
            } else if (!node.type.isEntryPoint && backEdges.length === 0) {
                signal = 6;
            } else if (!node.type.isEntryPoint && allEdges.length === 0) {
                signal = 2;
            }
            
            let finalSignal: number | null = null;
            if (signal !== null) {
                const backDeadEdges = node.back.filter((x) => deadNodes.has(x));
                
                let minBackSignal = signal;
                for (const backDeadEdge of backDeadEdges) {
                    for (const arrow of backDeadEdge.arrows) {
                        if (arrow.signal > 0) {
                            minBackSignal = Math.min(minBackSignal, arrow.signal);
                        }
                    }
                }

                finalSignal = minBackSignal;

                deadNodes.add(node);

                for (let i = 0; i < allEdges.length; i++) {
                    const edge = allEdges[i];
                    visited.delete(edge);
                }
                for (let i = 0; i < backEdges.length; i++) {
                    const backEdge = backEdges[i];
                    visited.delete(backEdge);
                }
            } else if (node.type === ASTNodeType.LOGIC_XOR && backEdges.length < 2 || node.type === ASTNodeType.PATH && allEdges.length !== getArrowRelations(node.arrows[0].type).length) {
                finalSignal = 4;
            }
            
            if (finalSignal === null) {
                continue;
            }

            for (let i = 0; i < node.arrows.length; i++) {
                node.arrows[i].signal = finalSignal;
            }
        }
        // TODO: Make optimization for strip nodes like this
    }

    showDebugPropagation(rootNode: RootNode) {
        const visited = new Set<ASTNode>();
        const nodeQueue: ASTNode[] = [rootNode];
        
        while (nodeQueue.length > 0) {
            const node = nodeQueue.shift()!;
            if (visited.has(node)) {
                continue;
            }
            visited.add(node);
            nodeQueue.push(...node.allEdges);
            if (node.arrows.length === 0) {
                continue;
            }
            
            let signal = 0;
            for (let i = 0; i < node.back.length; i++) {
                const backEdge = node.back[i];
                signal += backEdge.type.index + 1;
            }
            signal = signal % 6 + 1;
            for (let i = 0; i < node.arrows.length; i++) {
                node.arrows[i].signal = signal;
            }
        }
    }
}