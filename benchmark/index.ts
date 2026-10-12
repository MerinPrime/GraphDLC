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

export const MAP_DATA: string | number[] =
    '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';
export const WARMUP_TICKS = 1_000_000;
export const TICKS_PER_SAMPLE = 100_000;
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
