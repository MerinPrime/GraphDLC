import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { GameMap } from '@logic-arrows/game-logic/game-map';
import { load } from '@logic-arrows/utils/load';
import { Graph } from 'src/core/graph/ast/Graph';
import { NodeSignal } from 'src/core/graph/engines/core/NodeSignal';
import type { BaseEngine } from 'src/core/graph/engines/core/types/BaseEngine';
import type { IEngine } from 'src/core/graph/engines/core/types/IEngine';
import { instantiateRustEngine } from 'src/core/graph/engines/native_exp/loader';
import { NativeExpEngine } from 'src/core/graph/engines/native_exp/NativeExpEngine';
import { RawEngine } from 'src/core/graph/engines/raw/RawEngine';
import {
    GraphEngine,
    GraphEngineSetting,
} from 'src/plugins/graphdlc/settings/performance/GraphEngineSetting';

export type TargetEngineType = 'all' | 'raw' | 'native';

export const MAP_DATA: string | number[] = 'benchmark/computer.txt';
export const WARMUP_TICKS = 1_000_000;
export const TICKS_PER_SAMPLE = 1_000_000;
export const SAMPLES = 10;
export const TARGET_ENGINE: TargetEngineType = 'native';

interface LoadedGraph<T extends IEngine = IEngine> {
    map: GameMap;
    graph: Graph;
    engine: T;
}

interface BenchmarkTarget {
    name: string;
    engine: IEngine;
    nodes: number;
    tpsList: number[];
}

interface BenchmarkSummary {
    name: string;
    nodes: number;
    meanTps: number;
    stdTps: number;
    stdPercent: number;
}

function parseMapBuffer(input: string | number[]): number[] {
    if (Array.isArray(input)) return input;
    const trimmed = input.trim();
    if (!trimmed) return createDefaultMapBuffer();

    if (fs.existsSync(trimmed)) {
        return parseMapBuffer(fs.readFileSync(trimmed, 'utf8').trim());
    }

    try {
        const binaryString = atob(trimmed);
        const buffer = new Array<number>(binaryString.length);
        for (let i = 0; i < binaryString.length; i++)
            buffer[i] = binaryString.charCodeAt(i);
        return buffer;
    } catch {
        try {
            const parsed: unknown = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed as number[];
        } catch {}
    }
    throw new Error('Unsupported map format');
}

function createDefaultMapBuffer(): number[] {
    const buffer: number[] = [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 15];
    for (let i = 0; i < 16; i++) buffer.push(i, 0);
    return buffer;
}

function loadMapIntoGraph<T extends BaseEngine<any>>(
    mapBuffer: number[],
    createEngine: () => T,
): LoadedGraph<T> {
    GraphEngineSetting.value = GraphEngine.STANDARD;
    const map = new GameMap();
    const graph = new Graph(map);
    load(map, mapBuffer);

    const engine = createEngine();
    graph.engine = engine;
    graph.updater.beginLoading();
    console.log('[Benchmark] Updating arrow states...');
    const startUpdateArrows = performance.now();
    map.chunks.forEach((chunk) => {
        for (let i = 0; i < 256; i++) {
            const arrow = chunk.getArrowByIndex(i);
            if (arrow.type !== 0) {
                const globalX = chunk.x * 16 + (i & 0x0f);
                const globalY = chunk.y * 16 + (i >> 4);
                graph.updateArrowState(arrow, chunk, globalX, globalY);
            }
        }
    });
    graph.updater.endLoading();
    console.log(
        `[Benchmark] Arrows updated in ${(performance.now() - startUpdateArrows).toFixed(1)}ms. Dirty nodes in PathManager: ${(graph as any).pathManager.dirtyNodes.size}`,
    );
    console.log(
        'EventDispatcher listeners:',
        (graph as any).eventDispatcher.listeners.map(
            (l: any) => l.constructor?.name,
        ),
    );

    console.log('[Benchmark] Building cycles...');
    const startCycle = performance.now();
    (graph as any).cycleManager.flushSync();
    console.log(
        `[Benchmark] Cycles built in ${(performance.now() - startCycle).toFixed(1)}ms. Total active cycles: ${graph.getCycles().filter(Boolean).length}`,
    );

    console.log('[Benchmark] Building paths...');
    const startPath = performance.now();
    graph.flushPaths();
    console.log(
        `[Benchmark] Paths built in ${(performance.now() - startPath).toFixed(1)}ms. Total paths: ${graph.getPaths().length}`,
    );
    return { map, graph, engine };
}

const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));
function sleepSync(ms: number): void {
    Atomics.wait(sleepBuffer, 0, 0, ms);
}

type GlobalWithGc = typeof globalThis & {
    gc?: () => void;
};

function testCycleReadHeadToPath(engine: NativeExpEngine, graph: Graph): void {
    console.log('\n--- Testing Cycle Read Head To Path ---');
    const cycles = graph.getCycles().filter((c) => c !== null);
    console.log('Total cycles in graph:', cycles.length);

    // Find candidate read head 49190 with outgoing link 49199
    const link = graph.getNode(49199);
    const n49144 = graph.getNode(49144);
    if (link && n49144) {
        const secondBack = n49144.backLinks.find((b) => b.nodeIdx !== 49176);
        if (secondBack) {
            (graph as any).removeNodeLink(secondBack, n49144, true);
            graph.flushPaths();
        }

        const p = link.path?.ref;
        if (!p) {
            throw new Error('Cycle read head path was not created');
        }

        const targetNode = p.targets[0].node;
        const targetDelay = p.targets[0].delay;
        console.log(
            `Cycle path created: Path ${p.index}, source=${p.sourceNode.nodeIdx} (cycleHead=${p.sourceNode.cycle?.headType}), length=${p.nodes.length}, target=${targetNode.nodeIdx}, targetDelay=${targetDelay}`,
        );

        engine.reset();
        engine.setNodeSignal(p.sourceNode.nodeIdx, NodeSignal.ACTIVE);

        let targetActivated = false;
        let p0Activated = false;
        let pLastActivated = false;

        for (let t = 1; t <= targetDelay + 3; t++) {
            engine.runTick();
            const p0Sig = engine.state.getNodeSignal(p.nodes[0].nodeIdx);
            const pLastSig = engine.state.getNodeSignal(
                p.nodes[p.nodes.length - 1].nodeIdx,
            );
            const tgtSig = engine.state.getNodeSignal(targetNode.nodeIdx);

            if (t === 1 && p0Sig === NodeSignal.ACTIVE) {
                p0Activated = true;
            }
            if (t === targetDelay && pLastSig === NodeSignal.ACTIVE) {
                pLastActivated = true;
            }
            if (t === targetDelay + 1 && tgtSig === NodeSignal.ACTIVE) {
                targetActivated = true;
            }
        }

        if (!p0Activated || !pLastActivated || !targetActivated) {
            throw new Error(
                `Cycle path signal test failed: p0=${p0Activated}, pLast=${pLastActivated}, target=${targetActivated}`,
            );
        }

        console.log('✅ Cycle read head to path signal test passed!');

        if (secondBack) {
            (graph as any).addNodeLink(secondBack, n49144, true);
            graph.flushPaths();
        }
        engine.reset();

        // Test capability disabling: when an engine does not support paths
        // Create a new graph with an engine that does not support paths
        const rawMap = new GameMap();
        const rawGraph = new Graph(rawMap);
        rawGraph.engine = new RawEngine();
        console.log(
            'Testing capabilities on fresh graph with RawEngine (supportPaths = false):',
        );
        console.log(
            '  supportPathes:',
            rawGraph.engine.capabilities.supportPathes,
        );
        rawGraph.flushPaths();
        console.log(
            '  Paths count after flushPaths on RawEngine:',
            rawGraph.getPaths().length,
        );
        if (rawGraph.getPaths().length !== 0) {
            throw new Error(
                'Paths should not be registered when supportPaths is false',
            );
        }
        console.log('✅ Capabilities supportPaths disabled test passed!');
    }
}

function testInteractivePathSignals(
    engine: NativeExpEngine,
    graph: Graph,
): void {
    // Find a linear path with >= 3 nodes and targets
    const path = graph
        .getPaths()
        .find(
            (p) =>
                p.nodes.length >= 3 &&
                p.targets.length > 0 &&
                !p.splitters.length,
        );
    if (!path) {
        console.warn('Could not find a linear path for test');
        return;
    }

    const lastNode = path.nodes[path.nodes.length - 1];
    const middleNode = path.nodes[Math.floor(path.nodes.length / 2)];
    const target = path.targets[0].node;
    const targetDelay = path.targets[0].delay;

    console.log(
        `Testing interactive signals on Path ${path.index}: length=${path.nodes.length}, target=${target.nodeIdx}, targetDelay=${targetDelay}`,
    );
    console.log(
        `lastNode=${lastNode.nodeIdx}, links=${lastNode.links.map((l) => l.nodeIdx).join(',')}, target=${target.nodeIdx}`,
    );

    // Test 1: Click last path node
    engine.reset();
    engine.setNodeSignal(lastNode.nodeIdx, NodeSignal.ACTIVE);
    if (
        engine.state.getNodeSignal(lastNode.nodeIdx) !== NodeSignal.ACTIVE ||
        engine.state.getNodeSignal(target.nodeIdx) !== NodeSignal.NONE
    ) {
        throw new Error('Test 1 failed: Initial state mismatch');
    }
    engine.runTick();
    if (
        engine.state.getNodeSignal(lastNode.nodeIdx) !== NodeSignal.NONE ||
        engine.state.getNodeSignal(target.nodeIdx) !== NodeSignal.ACTIVE
    ) {
        throw new Error(
            `Test 1 failed: Expected lastNode=NONE and target=ACTIVE at tick 1, got lastNode=${engine.state.getNodeSignal(lastNode.nodeIdx)}, target=${engine.state.getNodeSignal(target.nodeIdx)}`,
        );
    }
    engine.runTick();
    if (engine.state.getNodeSignal(target.nodeIdx) !== NodeSignal.NONE) {
        throw new Error(
            `Test 1 failed: Expected target=NONE at tick 2, got target=${engine.state.getNodeSignal(target.nodeIdx)}`,
        );
    }

    // Test 2: Click middle path node
    engine.reset();
    engine.setNodeSignal(middleNode.nodeIdx, NodeSignal.ACTIVE);
    const middleDist = middleNode.path?.distanceFromSource ?? 0;
    const hopsToTarget = targetDelay - middleDist; // ticks until target activates

    for (let t = 0; t <= hopsToTarget + 1; t++) {
        const lastSig = engine.state.getNodeSignal(lastNode.nodeIdx);
        const tgtSig = engine.state.getNodeSignal(target.nodeIdx);

        // They must NEVER be ACTIVE simultaneously!
        if (lastSig === NodeSignal.ACTIVE && tgtSig === NodeSignal.ACTIVE) {
            throw new Error(
                `Test 2 failed: lastNode and target became ACTIVE simultaneously at tick ${t}!`,
            );
        }

        engine.runTick();
    }

    console.log(
        '✅ Interactive path signal tests passed (no gap, no simultaneous activation)!',
    );

    // Test 3: Path build while signal reaches target (e.g. XOR)
    engine.reset();
    (graph as any).pathManager.dismantlePath(path);
    engine.reset();

    // Now path is dismantled (normal nodes). Inject 1-tick pulse at source
    engine.setNodeSignal(path.sourceNode.nodeIdx, NodeSignal.ACTIVE);
    engine.runTick();
    engine.setNodeSignal(path.sourceNode.nodeIdx, NodeSignal.NONE);

    // Run ticks until signal reaches target (targetDelay ticks, so at t=targetDelay target is active)
    for (let t = 1; t <= targetDelay; t++) {
        engine.runTick();
    }
    const wrapper = (engine as any).wrapper;
    console.log(
        `At target arrival: target signal = ${engine.state.getNodeSignal(target.nodeIdx)}, signals_count = ${wrapper.getNodeSignalsCount(target.nodeIdx)}, lastNode signal = ${engine.state.getNodeSignal(lastNode.nodeIdx)}`,
    );
    if (engine.state.getNodeSignal(target.nodeIdx) !== NodeSignal.ACTIVE) {
        throw new Error('Target was expected to be ACTIVE before rebuild');
    }

    // Now rebuild path while signal is at target!
    for (const n of path.nodes) {
        (graph as any).pathManager.dirtyNodes.add(n);
    }
    (graph as any).pathManager.dirtyNodes.add(path.sourceNode);
    graph.flushPaths();
    console.log(`Paths count after rebuild: ${graph.getPaths().length}`);
    console.log(`Current engine tick: ${engine.state.getTick()}`);
    console.log(
        `Right after rebuild: target signal = ${engine.state.getNodeSignal(target.nodeIdx)}, signals_count = ${wrapper.getNodeSignalsCount(target.nodeIdx)}`,
    );

    // Now run 1 tick: target MUST deactivate!
    engine.runTick();
    console.log(
        `After 1 tick post-rebuild: target signal = ${engine.state.getNodeSignal(target.nodeIdx)}, signals_count = ${wrapper.getNodeSignalsCount(target.nodeIdx)}`,
    );
    if (engine.state.getNodeSignal(target.nodeIdx) !== NodeSignal.NONE) {
        throw new Error(
            `Target stuck ACTIVE! Expected NONE, got ${engine.state.getNodeSignal(target.nodeIdx)}`,
        );
    }
    console.log('✅ Path build while signal at target passed!');

    // Test 4: Path build while signal is at lastNode (1 tick before target)
    engine.reset();
    (graph as any).pathManager.dismantlePath(path);
    engine.reset();

    engine.setNodeSignal(path.sourceNode.nodeIdx, NodeSignal.ACTIVE);
    engine.runTick();
    engine.setNodeSignal(path.sourceNode.nodeIdx, NodeSignal.NONE);

    // Run until signal reaches lastNode (t = targetDelay - 1)
    for (let t = 1; t < targetDelay; t++) {
        engine.runTick();
    }
    console.log(
        `At lastNode arrival: target signal = ${engine.state.getNodeSignal(target.nodeIdx)}, lastNode signal = ${engine.state.getNodeSignal(lastNode.nodeIdx)}`,
    );
    if (engine.state.getNodeSignal(lastNode.nodeIdx) !== NodeSignal.ACTIVE) {
        throw new Error('lastNode was expected to be ACTIVE before rebuild');
    }

    // Rebuild path while signal is at lastNode!
    for (const n of path.nodes) {
        (graph as any).pathManager.dirtyNodes.add(n);
    }
    (graph as any).pathManager.dirtyNodes.add(path.sourceNode);
    graph.flushPaths();

    // After 1 tick: target MUST become ACTIVE!
    engine.runTick();
    console.log(
        `1 tick post-rebuild: target signal = ${engine.state.getNodeSignal(target.nodeIdx)}, signals_count = ${wrapper.getNodeSignalsCount(target.nodeIdx)}`,
    );
    if (engine.state.getNodeSignal(target.nodeIdx) !== NodeSignal.ACTIVE) {
        throw new Error('Expected target to activate at tick 1 post-rebuild');
    }

    // After 2 ticks: target MUST deactivate!
    engine.runTick();
    console.log(
        `2 ticks post-rebuild: target signal = ${engine.state.getNodeSignal(target.nodeIdx)}, signals_count = ${wrapper.getNodeSignalsCount(target.nodeIdx)}`,
    );
    if (engine.state.getNodeSignal(target.nodeIdx) !== NodeSignal.NONE) {
        throw new Error('Expected target to deactivate at tick 2 post-rebuild');
    }
    console.log('✅ Path build while signal at lastNode passed!');

    engine.reset();
}

export function runBenchmark(): void {
    try {
        instantiateRustEngine();
    } catch (e: unknown) {
        console.warn('WASM initialization warning:', e);
    }

    const mapBuffer = parseMapBuffer(MAP_DATA);
    const targets: BenchmarkTarget[] = [];

    if (TARGET_ENGINE === 'all' || TARGET_ENGINE === 'raw') {
        const { graph, engine } = loadMapIntoGraph(
            mapBuffer,
            () => new RawEngine(),
        );
        targets.push({
            name: 'RawEngine (JS)',
            engine,
            nodes: graph.getNodes().length,
            tpsList: [],
        });
    }

    let nativeGraphRef: Graph | null = null;

    if (TARGET_ENGINE === 'all' || TARGET_ENGINE === 'native') {
        const { graph, engine } = loadMapIntoGraph(
            mapBuffer,
            () => new NativeExpEngine(),
        );
        nativeGraphRef = graph;
        testCycleReadHeadToPath(engine as NativeExpEngine, graph);
        testInteractivePathSignals(engine as NativeExpEngine, graph);
        targets.push({
            name: 'NativeExpEngine (WASM)',
            engine,
            nodes: graph.getNodes().length,
            tpsList: [],
        });
    }

    if (TARGET_ENGINE === 'all') {
        const raw = targets.find((t) => t.name.includes('Raw'))?.engine;
        const native = targets.find((t) => t.name.includes('Native'))?.engine;
        if (raw && native) {
            raw.reset();
            native.reset();
            native.state.setSeed((raw.state as any).seed);
            for (let tick = 0; tick < 5000; tick++) {
                raw.runTick();
                native.runTick();
                for (let n = 0; n < targets[0].nodes; n++) {
                    const s1 = raw.state.getNodeSignal(n);
                    const s2 = native.state.getNodeSignal(n);
                    if (s1 !== s2) {
                        const node = nativeGraphRef?.getNodes()[n];
                        console.error('Mismatch node:', {
                            tick,
                            n,
                            type: node?.type,
                            posHash: node?.posHash,
                            rawTick: raw.state.tick,
                            natTick: native.state.getTick(),
                            s1,
                            s2,
                        });
                        throw new Error(
                            `Equivalence mismatch at tick ${tick}, node ${n}: raw=${s1}, native=${s2}`,
                        );
                    }
                }
            }
            console.log(
                '✅ 5,000 ticks verified 100% equivalent with RawEngine!',
            );
            raw.reset();
            native.reset();
        }
    }

    for (const item of targets) {
        item.engine.reset();
        if (WARMUP_TICKS > 0) {
            item.engine.runManyTicks(WARMUP_TICKS);
        }
        item.engine.reset();
    }

    const globalWithGc = globalThis as GlobalWithGc;
    if (typeof globalWithGc.gc === 'function') {
        globalWithGc.gc();
    }

    for (let sample = 0; sample < SAMPLES; sample++) {
        for (const item of targets) {
            item.engine.reset();
            sleepSync(50);
            const start = performance.now();
            item.engine.runManyTicks(TICKS_PER_SAMPLE);
            const elapsedSec = (performance.now() - start) / 1000;

            item.tpsList.push(TICKS_PER_SAMPLE / elapsedSec);
        }
    }

    const summary: BenchmarkSummary[] = targets.map((item) => {
        const meanTps =
            item.tpsList.reduce((acc, v) => acc + v, 0) / item.tpsList.length;
        const variance =
            item.tpsList.reduce((acc, v) => acc + (v - meanTps) ** 2, 0) /
            (item.tpsList.length - 1 || 1);
        const stdTps = Math.sqrt(variance);
        const stdPercent = (stdTps / meanTps) * 100;

        return {
            name: item.name,
            nodes: item.nodes,
            meanTps,
            stdTps,
            stdPercent,
        };
    });

    console.log(
        `\nNodes: ${summary[0]?.nodes ?? 0} | Samples: ${SAMPLES} × ${TICKS_PER_SAMPLE.toLocaleString()} ticks | Warmup: ${WARMUP_TICKS.toLocaleString()}\n`,
    );

    console.table(
        summary.map((r) => ({
            Engine: r.name,
            TPS: Math.round(r.meanTps).toLocaleString(),
            'Std (TPS)': `±${Math.round(r.stdTps).toLocaleString()}`,
            'Std%': `±${r.stdPercent.toFixed(2)}%`,
        })),
    );

    if (summary.length === 2) {
        const [a, b] = summary;
        const diff = b.meanTps / a.meanTps;
        if (diff >= 1) {
            console.log(
                `⚡ Speedup: ${b.name} is ${diff.toFixed(2)}x faster than ${a.name}\n`,
            );
        } else {
            console.log(
                `⚡ Speedup: ${a.name} is ${(1 / diff).toFixed(2)}x faster than ${b.name}\n`,
            );
        }
    }
}

runBenchmark();
