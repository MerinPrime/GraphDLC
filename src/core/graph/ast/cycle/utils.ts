import { NodeType } from '../../engines/core/NodeType';
import type { GraphNode } from '../GraphNode';

const ALLOWED_IN_CYCLE = new Set([NodeType.PATH, NodeType.LOGIC_XOR]);

export function canBeInCycle(node: GraphNode): boolean {
    return ALLOWED_IN_CYCLE.has(node.type);
}
