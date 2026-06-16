import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import terser from '@rollup/plugin-terser';
import { ZipArchive } from 'archiver';
import {
    defineConfig,
    type RolldownOptions,
    type RolldownPlugin,
} from 'rolldown';
import * as sass from 'sass';

const projectRoot = process.cwd();

const pkg = JSON.parse(
    fs.readFileSync(path.resolve(projectRoot, 'package.json'), 'utf8'),
);

function zipDirectory(sourceDir: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });

        output.on('close', () => resolve());
        archive.on('error', (err) => reject(err));

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

const rustWasmPlugin = (): RolldownPlugin => ({
    name: 'rust-wasm-plugin',

    async resolveId(id, importer) {
        if (id.endsWith('Cargo.toml')) {
            const resolved = await this.resolve(id, importer, {
                skipSelf: true,
            });
            if (resolved) {
                return resolved.id;
            }
        }
        return null;
    },

    load(id) {
        if (id.endsWith('Cargo.toml')) {
            const rustDir = path.dirname(id);
            console.log(`\n[Rolldown] Compiling Rust crate in: ${rustDir}...`);

            try {
                execSync('rustc --version', { stdio: 'ignore' });

                try {
                    execSync(
                        'rustup target list --installed | grep wasm32-unknown-unknown',
                        { stdio: 'ignore' },
                    );
                } catch {
                    console.log(
                        '[Rolldown] Installing wasm32-unknown-unknown target...',
                    );
                    execSync('rustup target add wasm32-unknown-unknown', {
                        stdio: 'inherit',
                    });
                }

                execSync(
                    'cargo build --target wasm32-unknown-unknown --release',
                    {
                        cwd: rustDir,
                        stdio: 'inherit',
                    },
                );

                const cargoToml = fs.readFileSync(id, 'utf8');
                let libName = 'graph';

                const libMatch = cargoToml.match(
                    /\[lib\][^]*?name\s*=\s*"([^"]+)"/,
                );
                if (libMatch) {
                    libName = libMatch[1].replace(/-/g, '_');
                } else {
                    const pkgMatch = cargoToml.match(/name\s*=\s*"([^"]+)"/);
                    if (pkgMatch) {
                        libName = pkgMatch[1].replace(/-/g, '_');
                    }
                }

                const targetWasm = path.resolve(
                    rustDir,
                    `target/wasm32-unknown-unknown/release/lib${libName}.wasm`,
                );
                const altWasm = path.resolve(
                    rustDir,
                    `target/wasm32-unknown-unknown/release/${libName}.wasm`,
                );

                let wasmPath = '';
                if (fs.existsSync(targetWasm)) {
                    wasmPath = targetWasm;
                } else if (fs.existsSync(altWasm)) {
                    wasmPath = altWasm;
                } else {
                    throw new Error(
                        `WASM file not found. Expected lib${libName}.wasm or ${libName}.wasm`,
                    );
                }

                try {
                    execSync('wasm-opt --version', { stdio: 'ignore' });
                    console.log('[Rolldown] Optimizing WASM with wasm-opt...');
                    execSync(
                        `wasm-opt --all-features -O3 "${wasmPath}" -o "${wasmPath}"`,
                        { stdio: 'inherit' },
                    );
                } catch {}

                const wasmBuffer = fs.readFileSync(wasmPath);
                const base64 = wasmBuffer.toString('base64');

                console.log(
                    `[Rolldown] Rust compiled. WASM: ${(wasmBuffer.length / 1024).toFixed(2)} KB, Base64: ${(base64.length / 1024).toFixed(2)} KB\n`,
                );

                return `export default ${JSON.stringify(base64)};`;
            } catch (err: any) {
                this.error(`Rust compilation failed: ${err.message}`);
            }
        }
        return null;
    },
});

const rawPlugin = (): RolldownPlugin => ({
    name: 'raw-plugin',

    async resolveId(id, importer) {
        if (id.includes('?raw')) {
            const [cleanId, query] = id.split('?');

            const resolved = await this.resolve(cleanId, importer, {
                skipSelf: true,
            });

            if (resolved) {
                return `${resolved.id}?${query}`;
            }
        }
        return null;
    },

    load(id) {
        if (id.includes('?raw')) {
            const [cleanPath] = id.split('?');

            this.addWatchFile(cleanPath);

            if (cleanPath.endsWith('.scss')) {
                const result = sass.compile(cleanPath);
                if (result.loadedUrls) {
                    for (const url of result.loadedUrls) {
                        this.addWatchFile(fileURLToPath(url));
                    }
                }
                return `export default ${JSON.stringify(result.css)};`;
            }

            const content = fs.readFileSync(cleanPath, 'utf8');
            return `export default ${JSON.stringify(content)};`;
        }
        return null;
    },
});

const scssInjectPlugin = (): RolldownPlugin => ({
    name: 'scss-inject-plugin',
    transform(_code, id) {
        if (id.endsWith('.scss') && !id.includes('?raw')) {
            const result = sass.compile(id);
            if (result.loadedUrls) {
                for (const url of result.loadedUrls) {
                    this.addWatchFile(fileURLToPath(url));
                }
            }
            const css = result.css.toString();
            return {
                code: `
                    const style = document.createElement('style');
                    style.textContent = ${JSON.stringify(css)};
                    document.head.appendChild(style);
                `,
                map: null,
            };
        }
        return null;
    },
});

const chromeExtensionPlugin = (
    target: 'newchrome' | 'oldchrome',
): RolldownPlugin => ({
    name: `chrome-extension-plugin-${target}`,
    async writeBundle() {
        const outDir = path.resolve(projectRoot, `dist/${target}`);
        const templateDir = path.resolve(projectRoot, `templates/${target}`);

        const manifestSrc = path.join(templateDir, 'manifest.json');
        const manifestDest = path.join(outDir, 'manifest.json');
        if (fs.existsSync(manifestSrc)) {
            const manifest = JSON.parse(fs.readFileSync(manifestSrc, 'utf8'));
            manifest.version = pkg.version;
            fs.writeFileSync(manifestDest, JSON.stringify(manifest, null, 2));
        }

        const imagesSrc = path.join(templateDir, 'images');
        const imagesDest = path.join(outDir, 'images');
        if (fs.existsSync(imagesSrc)) {
            fs.cpSync(imagesSrc, imagesDest, { recursive: true });
        }

        if (target === 'oldchrome') {
            const injectorSrc = path.join(templateDir, 'injector.js');
            const injectorDest = path.join(outDir, 'injector.js');
            if (fs.existsSync(injectorSrc)) {
                fs.copyFileSync(injectorSrc, injectorDest);
            }
        }

        const zipDest = path.resolve(projectRoot, `dist/${target}-dist.zip`);
        await zipDirectory(outDir, zipDest);
        console.log(
            `\n[Rolldown] Successfully packaged [${target}] artifact into: ${zipDest}`,
        );
    },
});

const tampermonkeyPlugin = (): RolldownPlugin => ({
    name: 'tampermonkey-plugin',
    async writeBundle() {
        const outDir = path.resolve(projectRoot, 'dist/tampermonkey');
        const filePath = path.join(outDir, 'tampermonkey.js');

        if (fs.existsSync(filePath)) {
            const banner = `// ==UserScript==
// @name         ${pkg.name}
// @namespace    https://logic-arrows.io/
// @version      ${pkg.version}
// @description  ${pkg.description}
// @author       ${pkg.author}
// @match        https://logic-arrows.io/*
// @match        https://v1_2.logic-arrows.io/*
// @grant        none
// @run-at       document-start
// ==/UserScript==\n`;

            const content = fs.readFileSync(filePath, 'utf8');
            fs.writeFileSync(filePath, banner + content);
        }

        const zipDest = path.resolve(projectRoot, 'dist/tampermonkey-dist.zip');
        await zipDirectory(outDir, zipDest);
        console.log(
            `\n[Rolldown] Successfully packaged [tampermonkey] userscript into: ${zipDest}`,
        );
    },
});

const isProduction = process.env.NODE_ENV === 'production';

const baseInputConfig = {
    input: 'src/index.ts',
    resolve: {
        alias: {
            '@logic-arrows': path.resolve(projectRoot, 'logic-arrows/src'),
        },
    },
    transform: {
        define: {
            'process.env.IS_DEBUG': JSON.stringify(!isProduction),
        },
    },
};

const terserPlugin = terser({
    ecma: 2022,
    toplevel: true,
    module: true,
    compress: {
        defaults: true,
        passes: 5,
        toplevel: true,
        hoist_funs: true,
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_arrows: true,
        unsafe_undefined: true,
        pure_getters: true,
    },
    mangle: {
        toplevel: true,
    },
    format: {
        comments:
            /==UserScript==|==\/UserScript==|@name|@version|@author|@description|@match|@grant|@run-at|@namespace/i,
    },
});

const configs: RolldownOptions[] = [];

if (isProduction) {
    configs.push(
        {
            ...baseInputConfig,
            plugins: [
                rustWasmPlugin(),
                rawPlugin(),
                scssInjectPlugin(),
                chromeExtensionPlugin('newchrome'),
                terserPlugin,
            ],
            output: {
                file: 'dist/newchrome/index.js',
                format: 'iife' as const,
                name: 'graphdlc',
                sourcemap: 'hidden' as const,
                minify: false,
            },
        },
        {
            ...baseInputConfig,
            plugins: [
                rustWasmPlugin(),
                rawPlugin(),
                scssInjectPlugin(),
                chromeExtensionPlugin('oldchrome'),
                terserPlugin,
            ],
            output: {
                file: 'dist/oldchrome/index.js',
                format: 'iife' as const,
                name: 'graphdlc',
                sourcemap: 'hidden' as const,
                minify: false,
            },
        },
        {
            ...baseInputConfig,
            plugins: [
                rustWasmPlugin(),
                rawPlugin(),
                scssInjectPlugin(),
                tampermonkeyPlugin(),
                terserPlugin,
            ],
            output: {
                file: 'dist/tampermonkey/tampermonkey.js',
                format: 'iife' as const,
                name: 'graphdlc',
                sourcemap: 'hidden' as const,
                minify: false,
            },
        },
    );
} else {
    configs.push({
        ...baseInputConfig,
        plugins: [
            rustWasmPlugin(),
            rawPlugin(),
            scssInjectPlugin(),
            {
                name: 'dev-copy-plugin',
                async writeBundle() {
                    const devOutDir = path.resolve(projectRoot, 'dist/dev');

                    const publicSrc = path.resolve(
                        projectRoot,
                        'logic-arrows/public',
                    );
                    if (fs.existsSync(publicSrc)) {
                        fs.cpSync(publicSrc, devOutDir, { recursive: true });
                    }

                    const indexHtmlSrc = path.resolve(
                        projectRoot,
                        'templates/dev/index.html',
                    );
                    const indexHtmlDest = path.resolve(devOutDir, 'index.html');
                    if (fs.existsSync(indexHtmlSrc)) {
                        fs.copyFileSync(indexHtmlSrc, indexHtmlDest);
                    }
                },
            },
            terserPlugin,
        ],
        output: {
            file: 'dist/dev/graphdlc.js',
            format: 'iife' as const,
            name: 'graphdlc',
            sourcemap: true,
        },
    });
}

export default defineConfig(configs);
