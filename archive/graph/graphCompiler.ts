import {RootNode} from "../ast/rootNode";
import {GraphState} from "./graphState";
import {ASTNode} from "../ast/astNode";
import {CycleHeadNode} from "../ast/cycle/cycleHeadNode";
import {CycleData} from "../ast/cycle/cycleData";
import {NodeFlags} from "./nodeFlags";
import {CycleHeadType} from "../ast/cycle/cycleHeadType";
import {SignalWrapper} from "./signalWrapper";
import {RingBuffer} from "../utility/ringBuffer";

export class GraphCompiler {
    compile(rootNode: RootNode): GraphState {
        const nodeToIndex = new Map<ASTNode, number>();
        const indexToNode: ASTNode[] = [];
        let totalEdgesCount = 0;
        let totalEntryPointCount = 0;
        
        const ringBuffer = new RingBuffer<ASTNode>(rootNode.allEdges.length);
        ringBuffer.multiPush(rootNode.allEdges);
        while (ringBuffer.size > 0) {
            const node = ringBuffer.popTail()!;
            if (!nodeToIndex.has(node)) {
                nodeToIndex.set(node, indexToNode.length);
                for (let i = 0; i < node.arrows.length; i++) {
                    const arrow = node.arrows[i];
                    arrow.astIndex = indexToNode.length;
                }
                indexToNode.push(node);
                ringBuffer.multiPush(node.allEdges);
                totalEdgesCount += node.allEdges.length;
                if (node.type.isEntryPoint) {
                    totalEntryPointCount += 1;
                }
            }
        }
        
        const cyclesCount = rootNode.cycles.length;
        const totalCycleLength = rootNode.cycles.map(x => Math.ceil(x.length / 32)).reduce((x, y) => x + y, 0);
        const graphState = new GraphState(totalEntryPointCount, indexToNode.length, totalEdgesCount, cyclesCount, totalCycleLength);
        
        const cycleDataToID = new Map<CycleData, number>();
        let x = 0;
        for (let i = 0; i < rootNode.cycles.length; i++) {
            const cycle = rootNode.cycles[i];
            cycleDataToID.set(cycle, i);
            graphState.cycleLengths[i] = cycle.length;
            graphState.cycleOffsets[i] = x;
            for (let j = 0; j < cycle.length; j++) {
                const arrow = cycle.cycle[j];
                arrow.cycleID = i;
                arrow.cycleIndex = (cycle.length + j - 1) % cycle.length;
                arrow.signal = new SignalWrapper(
                    undefined,
                    arrow.cycleID,
                    arrow.cycleIndex,
                );
            }
            x += Math.ceil(cycle.length / 32);
        }
        
        let entryPointIndex = 0;
        let edgeIndex = 0;
        
        for (let i = 0; i < indexToNode.length; i++) {
            const node = indexToNode[i];
            
            const signalWrapper = new SignalWrapper(
                node.arrows[0].astIndex!,
                node.arrows[0].cycleID,
                node.arrows[0].cycleIndex,
            );
            for (let i = 0; i < node.arrows.length; i++) {
                const arrow = node.arrows[i];
                arrow.signal = signalWrapper;
            }
            
            if (node.type.isEntryPoint) {
                graphState.entryPoints[entryPointIndex++] = i;
            }
            
            let flags = 0;
            if (node.type.isEntryPoint)
                flags |= NodeFlags.EntryPoint;
            if (node.type.isAdditionalUpdate)
                flags |= NodeFlags.AdditionalUpdate;
            if (node instanceof CycleHeadNode && node.cycleHeadType !== CycleHeadType.READ)
                flags |= NodeFlags.CycleHead
            
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
                graphState.nodeToCycleID[i] = cycleDataToID.get(node.cycleData)!;
                graphState.cycleHeadTypes[i] = node.cycleHeadType;
                graphState.nodeCycleOffsets[i] = node.index;
            }
        }
        
        return graphState;
    }
}