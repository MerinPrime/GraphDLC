import {Arrow} from "../api/arrow";
import {ASTNodeType, getASTType} from "./astNodeType";
import {removeWithSwap} from "../utility/removeWithSwap";

export class ASTNode {
    arrows: Arrow[] = [];
    backEdges: ASTNode[] = [];
    allEdges: ASTNode[] = [];
    edges: ASTNode[] = [];
    detectors: ASTNode[] = [];
    type: ASTNodeType = ASTNodeType.PATH;
    isBranch: boolean = false;
    specialNode: ASTNode | undefined = undefined; // Detector & Blocker
    skipOptimization: boolean = false;

    makeFromArrow(arrow: Arrow): ASTNode {
        this.arrows.push(arrow);
        this.type = getASTType(arrow.type);
        return this;
    }
    
    filterDuplicates(): ASTNode {
        this.arrows = [...new Set(this.arrows)];
        this.backEdges = [...new Set(this.backEdges)];
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
        this.filterDuplicates();
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].remove();
        }
        return this;
    }
    
    remove() {
        for (let i = 0; i < this.backEdges.length; i++) {
            const backEdge = this.backEdges[i];
            removeWithSwap(backEdge.allEdges, this);
            removeWithSwap(backEdge.edges, this);
            removeWithSwap(backEdge.detectors, this);
            if (backEdge.specialNode === this) {
                backEdge.specialNode = undefined;
            }
        }

        for (let i = 0; i < this.allEdges.length; i++) {
            const edge = this.allEdges[i];
            removeWithSwap(edge.backEdges, this);
        }

        this.arrows.length = 0;
        this.backEdges.length = 0;
        this.allEdges.length = 0;
        this.edges.length = 0;
        this.detectors.length = 0;
        this.type = ASTNodeType.UNKNOWN;
        this.specialNode = undefined;
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
        
        for (let i = 0; i < this.backEdges.length; i++) {
            const backEdge = this.backEdges[i];
            replaceInArray(backEdge.allEdges);
            replaceInArray(backEdge.edges);
            replaceInArray(backEdge.detectors);
            newNode.backEdges.push(backEdge);
        }

        for (let i = 0; i < this.edges.length; i++) {
            const edge = this.edges[i];
            replaceInArray(edge.backEdges);
            newNode.allEdges.push(edge);
            newNode.edges.push(edge);
        }

        for (let i = 0; i < this.detectors.length; i++) {
            const edge = this.detectors[i];
            replaceInArray(edge.backEdges);
            newNode.allEdges.push(edge);
            newNode.detectors.push(edge);
        }

        for (let i = 0; i < this.arrows.length; i++) {
            const arrow = this.arrows[i];
            newNode.arrows.push(arrow);
        }
    }
}
