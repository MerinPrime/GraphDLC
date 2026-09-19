import { NodeType } from '../engines/core/NodeType';

const REWIND_NODE_TYPES = new Set<NodeType>([
    NodeType.DIRECTIONAL_BUTTON,
    NodeType.BUTTON,
    NodeType.RANDOM,
]);

export function isRewindNodeType(type: NodeType): boolean {
    return REWIND_NODE_TYPES.has(type);
}
