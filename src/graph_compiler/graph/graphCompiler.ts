import {RootNode} from "../ast/rootNode";
import {GraphState} from "./graphState";
import {ASTNode} from "../ast/astNode";
import {CycleHeadNode} from "../ast/cycle/cycleHeadNode";
import {ASTNodeType} from "../ast/astNodeType";

export class GraphCompiler {
    compile(rootNode: RootNode): GraphState {
        const nodeToIndex = new Map<ASTNode, number>();
        const indexToNode: ASTNode[] = [];
        let totalEdgesCount = 0;
        let totalEntryPointCount = 0;
        
        const queue = [...rootNode.allEdges];
        while (queue.length > 0) {
            const node = queue.shift()!;
            if (!nodeToIndex.has(node)) {
                nodeToIndex.set(node, indexToNode.length);
                for (let i = 0; i < node.arrows.length; i++) {
                    node.arrows[i].astIndex = indexToNode.length;
                }
                indexToNode.push(node);
                queue.push(...node.allEdges);
                totalEdgesCount += node.allEdges.length;
                if (node.type.isEntryPoint) {
                    totalEntryPointCount += 1;
                }
            }
        }
        
        const graphState = new GraphState(totalEntryPointCount, indexToNode.length, totalEdgesCount);
        let entryPointIndex = 0;
        let edgeIndex = 0;
        
        for (let i = 0; i < indexToNode.length; i++) {
            const node = indexToNode[i];
            
            if (node.type.isEntryPoint) {
                graphState.entryPoints[entryPointIndex++] = i;
            }
            
            let flags = 0;
            if (node.type.isEntryPoint)
                flags |= 0b1
            if (node.type.isAdditionalUpdate)
                flags |= 0b10
            if (node.type === ASTNodeType.CYCLE_HEAD)
                flags |= 0b100
            
            graphState.flags[i] = flags;
            graphState.types[i] = node.type.index;
            graphState.edgesPosition[i] = edgeIndex;
            graphState.edgesCount[i] = node.edges.length;
            graphState.detectorsCount[i] = node.detectors.length;

            for (let j = 0; j < node.edges.length; j++) {
                graphState.edges[edgeIndex++] = nodeToIndex.get(node.edges[j])!;
            }
            for (let j = 0; j < node.detectors.length; j++) {
                graphState.edges[edgeIndex++] = nodeToIndex.get(node.detectors[j])!;
            }
        }
        
        return graphState;
    }
}