import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { type RolldownPlugin, rolldown } from 'rolldown';

const projectRoot = process.cwd();
const cargoTomlPath = path.resolve(
    projectRoot,
    'src',
    'core',
    'graph',
    'engines',
    'native_exp',
    'rust',
    'Cargo.toml',
);

const rustWasmPlugin = (): RolldownPlugin => ({
    name: 'rust-wasm-plugin',

    async resolveId(id, importer) {
        if (id.endsWith('Cargo.toml')) {
            const resolved = await this.resolve(id, importer, {
                skipSelf: true,
            });
            if (resolved) return resolved.id;
        }
        return null;
    },

    load(id) {
        if (!id.endsWith('Cargo.toml')) return null;

        const rustDir = path.dirname(id);
        const candidates = [
            path.resolve(
                rustDir,
                'target/wasm32-unknown-unknown/release/graph.wasm',
            ),
            path.resolve(
                rustDir,
                'target/wasm32-unknown-unknown/release/libgraph.wasm',
            ),
        ];

        const wasmPath = candidates.find((p) => fs.existsSync(p));
        if (!wasmPath) {
            throw new Error(
                `WASM file not found in ${rustDir}/target/... Сначала соберите WASM (cargo build --release).`,
            );
        }

        const wasmBuffer = fs.readFileSync(wasmPath);
        return `export default ${JSON.stringify(wasmBuffer.toString('base64'))};`;
    },
});

async function main(): Promise<void> {
    const cargoTomlDir = path.dirname(cargoTomlPath);
    console.log(
        `[Benchmark Builder] Сборка Rust/WASM модуля (${cargoTomlDir})...`,
    );
    try {
        if (!fs.existsSync(cargoTomlPath)) {
            throw new Error(`Cargo.toml не найден по пути: ${cargoTomlPath}`);
        }
        execSync('cargo build --release --target wasm32-unknown-unknown', {
            cwd: cargoTomlDir,
            stdio: 'inherit',
        });
        console.log('[Benchmark Builder] Rust/WASM собран успешно.');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Benchmark Builder] Ошибка сборки Rust/WASM:', message);
        process.exit(1);
    }

    const outDir = path.resolve(projectRoot, 'dist/benchmark');
    fs.mkdirSync(outDir, { recursive: true });

    const bundle = await rolldown({
        input: path.resolve(projectRoot, 'benchmark/index.ts'),
        platform: 'node',
        plugins: [rustWasmPlugin()],
        resolve: {
            alias: {
                src: path.resolve(projectRoot, 'src'),
                '@logic-arrows': path.resolve(projectRoot, 'logic-arrows/src'),
            },
        },
    });

    const outFile = path.resolve(outDir, 'runner.cjs');

    await bundle.write({
        file: outFile,
        format: 'cjs',
        intro: `
            if (typeof globalThis.Image === 'undefined') globalThis.Image = class Image {};
            if (typeof globalThis.location === 'undefined') globalThis.location = { pathname: '/map' };
            if (typeof globalThis.requestAnimationFrame === 'undefined') {
                globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
            }
            if (typeof globalThis.cancelAnimationFrame === 'undefined') {
                globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
            }
        `,
    });

    const child = spawn(
        process.execPath,
        [
            '--experimental-strip-types',
            '--expose-gc',
            '--max-old-space-size=4096',
            outFile,
        ],
        { stdio: 'inherit' },
    );

    child.on('exit', (code) => {
        process.exit(code ?? 0);
    });
}

main().catch((err: unknown) => {
    console.error('[Benchmark Builder] Ошибка:', err);
    process.exit(1);
});
