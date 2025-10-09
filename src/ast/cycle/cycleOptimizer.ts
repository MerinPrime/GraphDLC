import {ASTNode} from "../astNode";
import {CycleHeadType, getCycleHeadType} from "./cycleHeadType";
import {CycleHeadNode} from "./cycleHeadNode";
import {CycleData} from "./cycleData";
import {ASTNodeType} from "../astNodeType";
import {RootNode} from "../rootNode";

const ALLOWED_IN_CYCLE = new Set([
    ASTNodeType.PATH,
    ASTNodeType.DELAY,
    ASTNodeType.LOGIC_XOR,
]);

export class CycleOptimizer {
    optimizeCycles(rootNode: RootNode) {
        const cycles = this.findCycles(rootNode);
        // const nestedCycles = this.filterNestedCycles(cycles);
        this.makeCycleNodes(rootNode, cycles);
    }

    findCycles(rootNode: RootNode): ASTNode[][] {
        // BRUH CHATGPT
        /*
        Есть идея чтобы найти "якори" т.е. у колец есть обязательная хрень что endpoint это LOGIC_AND и в таком случае просто от него отталкиваться но сейчас вроде итак быстрее чем раньше так что ну ок.
         */
        
        // === 1) Сбор int-графа ===
        const idToNode: ASTNode[] = [rootNode];
        const nodeToId = new Map<ASTNode, number>([[rootNode, 0]]);
        const q: ASTNode[] = [rootNode];

        for (let head = 0; head < q.length; head++) {
            const n = q[head];
            const outs = n.allEdges;
            for (let i = 0; i < outs.length; i++) {
                const m = outs[i];
                if (!nodeToId.has(m)) {
                    nodeToId.set(m, idToNode.length);
                    idToNode.push(m);
                    q.push(m);
                }
            }
        }

        const N = idToNode.length;
        if (N === 1) return [];

        const valid = new Uint8Array(N);
        for (let i = 0; i < N; i++) {
            const n = idToNode[i];
            if (n.constructor === ASTNode && n.arrows.length === 1 && ALLOWED_IN_CYCLE.has(n.type)) {
                valid[i] = 1;
            }
        }

        const offsets = new Int32Array(N + 1);
        let M = 0;
        for (let i = 0; i < N; i++) {
            M += idToNode[i].allEdges.length;
            offsets[i + 1] = M;
        }
        const edges = new Int32Array(M);
        {
            let p = 0;
            for (let i = 0; i < N; i++) {
                const outs = idToNode[i].allEdges;
                for (let k = 0; k < outs.length; k++) edges[p++] = nodeToId.get(outs[k])!;
            }
        }

        // === 2) Вспомогательные структуры ===
        const edgeVisited = new Uint8Array(M);        // глобально по ребрам
        const nodeMinCycle = new Int32Array(N).fill(-1);

        // posInStack со штампом: чтобы избегать .fill(-1) каждый старт
        const posInStack = new Int32Array(N);
        const posStamp = new Uint32Array(N);
        let epoch = 1;

        // стек пути: два Int32Array (узел и позиция следующего ребра)
        // размер стека в худшем — V
        const nodeStack = new Int32Array(N);
        const edgePosStack = new Int32Array(N);
        // используем только для метки выхода из стека — через posInStack
        // foundCycles: Set<bigint> от комбинированного хэша
        const found = new Set<string>();
        const result: ASTNode[][] = [];

        // SplitMix64 для BigInt (стабильный быстрый хэш id)
        const splitmix64 = (x: bigint): bigint => {
            let z = (x + 0x9E3779B97F4A7C15n) & 0xFFFFFFFFFFFFFFFFn;
            z = (z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n & 0xFFFFFFFFFFFFFFFFn;
            z = (z ^ (z >> 27n)) * 0x94D049BB133111EBn & 0xFFFFFFFFFFFFFFFFn;
            return z ^ (z >> 31n);
        };
        
        // === 3) Основной цикл: стартуем из валидных нод ===
        for (let start = 0; start < N; start++) {
            if (!valid[start]) continue;

            // новый epoch — считаем, что posStamp!=epoch => posInStack "пусто"
            epoch++;
            let top = 0;

            // push(start)
            nodeStack[top] = start;
            edgePosStack[top] = offsets[start];
            posInStack[start] = 0;
            posStamp[start] = epoch;
            top++;

            while (top > 0) {
                const idx = top - 1;
                const cur = nodeStack[idx];
                let epos = edgePosStack[idx];

                if (epos >= offsets[cur + 1]) {
                    // pop
                    top--;
                    // "выходим" из стека: инвалидируем позицию
                    posStamp[cur] = 0; // быстрее, чем писать -1 и потом fill
                    continue;
                }

                // advance
                edgePosStack[idx] = epos + 1;
                const nei = edges[epos];

                // prune по известному минимальному циклу
                const minLen = nodeMinCycle[nei];
                if (minLen !== -1 && top >= minLen) continue;

                // ребро уже прогрызли ранее? пропустим
                if (edgeVisited[epos]) continue;
                edgeVisited[epos] = 1;

                if (!valid[nei]) continue;

                // В стек? или цикл?
                if (posStamp[nei] === epoch) {
                    // back-edge: цикл = срез стека [posInStack[nei]..top-1] + nei
                    const from = posInStack[nei];
                    const cycLen = (top - from); // включая "nei" в конце
                    if (cycLen >= 8) {
                        // посчитаем ключ по множеству вершин цикла (без сортировок)
                        // Множество вершин цикла = nodeStack[from..top-1] ∪ {nei}
                        // Соберём временно в nodeStackTemp-представлении: мы уже имеем все узлы подряд
                        // Пользуемся тем, что nodeStack[from..top-1] уже подряд. Считаем хэш и заполняем minCycle.
                        // Для хэша удобно взять непрерывный фрагмент + отдельно добавить nei (если он не совпадает с nodeStack[top-1], что бывает часто)
                        // Но nei уже входит в nodeStack[from], так как это back-edge к предку; тем не менее для корректности добавим его отдельно:
                        // Коммутативный хэш не зависит от дубликатов? Нет — поэтому добавлять второй раз нельзя.
                        // Проверка: если nodeStack[from] === nei, то nei уже в диапазоне.
                        let needExtraNei = 1;
                        if (nodeStack[from] === nei) needExtraNei = 0;

                        // Хэш
                        let sum = 0n, xh = 0n;
                        for (let i = from; i < top; i++) {
                            const h = splitmix64(BigInt(nodeStack[i] + 1));
                            sum = (sum + h) & 0xFFFFFFFFFFFFFFFFn;
                            xh ^= h;
                        }
                        if (needExtraNei) {
                            const h = splitmix64(BigInt(nei + 1));
                            sum = (sum + h) & 0xFFFFFFFFFFFFFFFFn;
                            xh ^= h;
                        }
                        const key = `${sum.toString(16)}:${xh.toString(16)}:${needExtraNei ? (top - from + 1) : (top - from)}`;

                        if (!found.has(key)) {
                            found.add(key);
                            // Собираем реальные узлы цикла (в порядке от nei к текущему)
                            // Порядок не критичен (у тебя раньше был reverse), здесь сделаем привычно: от nei по стеку вверх
                            const out: ASTNode[] = new Array(cycLen);
                            let w = 0;
                            for (let i = top - 1; i >= from; i--) out[w++] = idToNode[nodeStack[i]];
                            result.push(out);

                            // Обновим минимальные длины для узлов
                            for (let i = from; i < top; i++) {
                                const v = nodeStack[i];
                                const old = nodeMinCycle[v];
                                if (old === -1 || cycLen < old) nodeMinCycle[v] = cycLen;
                            }
                            const oldNei = nodeMinCycle[nei];
                            if (oldNei === -1 || cycLen < oldNei) nodeMinCycle[nei] = cycLen;
                        }
                    }
                    continue;
                }

                // ещё не в стеке — пушим
                nodeStack[top] = nei;
                edgePosStack[top] = offsets[nei];
                posInStack[nei] = top;
                posStamp[nei] = epoch;
                top++;
            }
        }

        return result;
    }
    
    filterNestedCycles(cycles: ASTNode[][]): ASTNode[][] {
        const validCycles: ASTNode[][] = [];
        const cyclesWithSets = cycles.map(cycle => ({ cycle, set: new Set(cycle) }));
        for (let i = 0; i < cyclesWithSets.length; i++) {
            const cycle = cyclesWithSets[i];
            let isValid = true;
            for (let j = 0; j < cyclesWithSets.length; j++) {
                if (j === i) continue;
                const innerCycle = cyclesWithSets[j];
                if (cycle.cycle.length < innerCycle.cycle.length) {
                    continue;
                }
                // innerCycle better for performance ( innerCycle <= cycle )
                const hasIntersection = innerCycle.cycle.some(node => cycle.set.has(node));
                if (hasIntersection) {
                    isValid = false;
                    break;
                }
            }
            if (isValid) {
                validCycles.push(cycle.cycle);
            } else {
                cyclesWithSets.splice(i, 1);
                i -= 1;
            }
        }
        return validCycles;
    }

    makeCycleNodes(rootNode: RootNode, cycles: ASTNode[][]) {
        for (let i = 0; i < cycles.length; i++) {
            const cycle = cycles[i];
            const cycleHeads: [ASTNode, ASTNode, number][] = [];
            let isValid = true;
            let anyEndpoint = false;
            for (let j = 0; j < cycle.length; j++) {
                const cycleArrow = cycle[j];
                if (cycleArrow.type === ASTNodeType.DELAY) {
                    isValid = false;
                    break;
                }
                const prevArrow = cycle[j + 1 < cycle.length ? j + 1 : 0];
                const nextArrow = cycle[(j - 1 > 0 ? j : cycle.length) - 1];
                if (cycleArrow.allEdges.length > 1) {
                    for (let k = 0; k < cycleArrow.allEdges.length; k++) {
                        const cycleEdge = cycleArrow.allEdges[k];
                        if (cycleEdge.type !== ASTNodeType.LOGIC_AND) {
                            isValid = false;
                            break;
                        }
                        if (cycleEdge === nextArrow) continue;
                        cycleHeads.push([cycleArrow, cycleEdge, j]);
                        anyEndpoint = true;
                    }
                }
                if (cycleArrow.backEdges.length > 1) {
                    for (let k = 0; k < cycleArrow.backEdges.length; k++) {
                        const cycleEdge = cycleArrow.backEdges[k];
                        if (cycleEdge === prevArrow) continue;
                        cycleHeads.push([cycleEdge, cycleArrow, j]);
                    }
                }
            }
            if (!isValid || !anyEndpoint) continue;
            // for (let j = 0; j < cycleHeads.length; j++) {
            //     const [prev, current, index] = cycleHeads[j];
            //     // May be do check if endpoint edge in cycle? if cycle duplicate signal to itself
            // }
            // if (!isValid) continue;
            const tempIndices = new Set<number>();
            const tempCurrents = new Set<ASTNode>();
            const tempPrevs = new Set<ASTNode>();
            for (let j = 0; j < cycleHeads.length; j++) {
                const [prev, current, index] = cycleHeads[j];
                if (tempIndices.has(index) || tempCurrents.has(current) || tempPrevs.has(prev)) {
                    isValid = false;
                    break;
                }
                tempIndices.add(index);
                tempCurrents.add(current);
                tempPrevs.add(prev);
            }
            if (!isValid) continue;
            const cycleHeadNodes: [ASTNode, CycleHeadNode][] = [];
            const cycleData = new CycleData([]);
            cycleData.length = cycle.length;
            for (let j = 0; j < cycleHeads.length; j++) {
                const [prev, current, index] = cycleHeads[j];
                const cycleHeadType = getCycleHeadType(prev.type, current.type)
                if (cycleHeadType === undefined) {
                    isValid = false;
                    break;
                }
                if (cycleHeadType === CycleHeadType.CLEAR) {
                    if (prev.specialNode !== current) {
                        isValid = false;
                        break;
                    }
                }
                const oldNode = cycleHeadType === CycleHeadType.READ ? current : prev;
                const newNode = new CycleHeadNode(cycleData);
                newNode.cycleHeadType = cycleHeadType;
                newNode.index = cycleHeadType === CycleHeadType.READ ? (cycle.length + index - 1) % cycle.length : index;
                cycleHeadNodes.push([oldNode, newNode])
            }
            if (!isValid) continue;
            for (let j = 0; j < cycle.length; j++) {
                const cycleArrow = cycle[j];
                cycleData.cycle.push(...cycleArrow.arrows);
                cycleArrow.remove(rootNode);
            }
            for (let j = 0; j < cycleHeadNodes.length; j++) {
                const [oldNode, newNode] = cycleHeadNodes[j];
                oldNode.replaceBy(newNode);
                if (newNode.cycleHeadType === CycleHeadType.READ) {
                    newNode.type = ASTNodeType.READ_CYCLE_HEAD;
                }
            }
            rootNode.cycles.push(cycleData);
        }
    }
}