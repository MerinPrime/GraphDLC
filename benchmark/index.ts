import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { GameMap } from '@logic-arrows/game-logic/game-map';
import { load } from '@logic-arrows/utils/load';
import { Graph } from 'src/core/graph/ast/Graph';
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
    console.log('[Benchmark] Building cycles...');
    const startCycle = performance.now();
    graph.flushCycles();
    const cycleCount = graph.getCycles().filter((c) => c !== null).length;
    console.log(
        `[Benchmark] Cycles built in ${(performance.now() - startCycle).toFixed(1)}ms. Total active cycles: ${cycleCount}`,
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

    if (TARGET_ENGINE === 'all' || TARGET_ENGINE === 'native') {
        const { graph, engine } = loadMapIntoGraph(
            mapBuffer,
            () => new NativeExpEngine(),
        );
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
            for (let tick = 0; tick < 5000; tick++) {
                raw.runTick();
                native.runTick();
                for (let n = 0; n < targets[0].nodes; n++) {
                    const s1 = raw.state.getNodeSignal(n);
                    const s2 = native.state.getNodeSignal(n);
                    if (s1 !== s2) {
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
