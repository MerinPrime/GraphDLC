import {RootNode} from "../ast/rootNode";
import {GraphState} from "./graphState";
import {ASTNode} from "../ast/astNode";
import {CycleHeadNode} from "../ast/cycle/cycleHeadNode";
import {ASTNodeType} from "../ast/astNodeType";
import {CycleData} from "../ast/cycle/cycleData";

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
        
        const cyclesCount = rootNode.cycles.length;
        const graphState = new GraphState(totalEntryPointCount, indexToNode.length, totalEdgesCount, cyclesCount);
        
        const cycleDataToID = new Map<CycleData, number>();
        for (let i = 0; i < rootNode.cycles.length; i++) {
            cycleDataToID.set(rootNode.cycles[i], i);
        }
        
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
            
            if (node instanceof CycleHeadNode) {
                const cycleID = cycleDataToID.get(node.cycleData)!;
                graphState.nodeToCycleID[i] = cycleID;
                graphState.cycleHeadTypes[i] = node.cycleHeadType;
                graphState.cycleOffsets[i] = node.index;
            }
        }
        
        for (let i = 0; i < cyclesCount; i++) {
            graphState.cycleLengths[i] = rootNode.cycles[i].length;
        }
        
        return graphState;
    }
}