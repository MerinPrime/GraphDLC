import {Arrow} from "../../api/arrow";
import {ASTNodeType, getASTType} from "./astNodeType";

export class ASTNode {
    arrows: Arrow[] = [];
    back: ASTNode[] = [];
    allEdges: ASTNode[] = [];
    edges: ASTNode[] = [];
    detectors: ASTNode[] = [];
    linked: boolean = false;
    type: ASTNodeType = ASTNodeType.PATH;
    isBranch: boolean = false;

    makeFromArrow(arrow: Arrow): ASTNode {
        this.arrows.push(arrow);
        this.type = getASTType(arrow.type);
        return this;
    }
    
    filterDuplicates(): ASTNode {
        this.arrows = [...new Set(this.arrows)];
        this.back = [...new Set(this.back)];
        this.allEdges = [...new Set(this.allEdges)];
        this.edges = [...new Set(this.edges)];
        this.detectors = [...new Set(this.detectors)];
        return this;
    }
    
    combine(nodes: ASTNode[]): ASTNode {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            node.replaceBy(this);
        }
        return this;
    }
    
    remove() {
        const removeInArray = (array: ASTNode[]) => {
            const inArrayIndex = array.indexOf(this);
            if (inArrayIndex === -1) {
                return;
            }
            array.splice(inArrayIndex, 1);
        };
        
        for (let i = 0; i < this.back.length; i++) {
            const backEdge = this.back[i];
            removeInArray(backEdge.allEdges);
            removeInArray(backEdge.edges);
            removeInArray(backEdge.detectors);
        }

        for (let i = 0; i < this.edges.length; i++) {
            const edge = this.edges[i];
            removeInArray(edge.back);
        }

        for (let i = 0; i < this.arrows.length; i++) {
            const arrow = this.arrows[i];
            arrow.ast_node = undefined;
        }
        
        this.arrows.length = 0;
        this.back.length = 0;
        this.allEdges.length = 0;
        this.edges.length = 0;
        this.detectors.length = 0;
        this.linked = false;
        this.type = ASTNodeType.PATH;
    }
    
    replaceBy(newNode: ASTNode) {
        const replaceInArray = (array: ASTNode[]) => {
            const inArrayIndex = array.indexOf(this);
            if (inArrayIndex === -1) {
                return;
            }
            array.splice(inArrayIndex, 1);
            array.push(newNode);
        };

        newNode.type = this.type;
        
        for (let i = 0; i < this.back.length; i++) {
            const backEdge = this.back[i];
            replaceInArray(backEdge.allEdges);
            replaceInArray(backEdge.edges);
            replaceInArray(backEdge.detectors);
            newNode.back.push(backEdge);
        }

        for (let i = 0; i < this.edges.length; i++) {
            const edge = this.edges[i];
            replaceInArray(edge.back);
            newNode.allEdges.push(edge);
            newNode.edges.push(edge);
        }

        for (let i = 0; i < this.detectors.length; i++) {
            const edge = this.detectors[i];
            replaceInArray(edge.back);
            newNode.allEdges.push(edge);
            newNode.detectors.push(edge);
        }

        for (let i = 0; i < this.arrows.length; i++) {
            const arrow = this.arrows[i];
            arrow.ast_node = newNode;
            newNode.arrows.push(arrow);
        }
    }
}
