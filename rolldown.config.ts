import { defineConfig, type RolldownOptions, type RolldownPlugin } from 'rolldown';
import fs from 'node:fs';
import path from 'node:path';
import * as sass from 'sass';
import { ZipArchive } from 'archiver';

const projectRoot = process.cwd();

const pkg = JSON.parse(
    fs.readFileSync(path.resolve(projectRoot, 'package.json'), 'utf8')
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

const rawPlugin = (): RolldownPlugin => ({
    name: 'raw-plugin',
    
    async resolveId(id, importer) {
        if (id.includes('?raw')) {
            const [cleanId, query] = id.split('?');
            
            const resolved = await this.resolve(cleanId, importer, { skipSelf: true });
            
            if (resolved) {
                return `${resolved.id}?${query}`;
            }
        }
        return null;
    },

    load(id) {
        if (id.includes('?raw')) {
            const [cleanPath] = id.split('?');
            
            if (cleanPath.endsWith('.scss')) {
                const result = sass.compile(cleanPath);
                return `export default ${JSON.stringify(result.css)};`;
            }
            
            const content = fs.readFileSync(cleanPath, 'utf8');
            return `export default ${JSON.stringify(content)};`;
        }
        return null;
    }
});

const scssInjectPlugin = (): RolldownPlugin => ({
    name: 'scss-inject-plugin',
    transform(code, id) {
        if (id.endsWith('.scss') && !id.includes('?raw')) {
            const result = sass.compile(id);
            const css = result.css.toString();
            return {
                code: `
                    const style = document.createElement('style');
                    style.textContent = ${JSON.stringify(css)};
                    document.head.appendChild(style);
                `,
                map: null
            };
        }
        return null;
    }
});

const chromeExtensionPlugin = (target: 'newchrome' | 'oldchrome'): RolldownPlugin => ({
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
        console.log(`\n[Rolldown] Successfully packaged [${target}] artifact into: ${zipDest}`);
    }
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
        console.log(`\n[Rolldown] Successfully packaged [tampermonkey] userscript into: ${zipDest}`);
    }
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

const configs: RolldownOptions[] = [];

if (isProduction) {
    configs.push(
        {
            ...baseInputConfig,
            plugins: [rawPlugin(), scssInjectPlugin(), chromeExtensionPlugin('newchrome')],
            output: {
                file: 'dist/newchrome/index.js',
                format: 'iife' as const,
                name: 'graphdlc',
                sourcemap: 'hidden' as const,
                minify: true,
            },
        },
        {
            ...baseInputConfig,
            plugins: [rawPlugin(), scssInjectPlugin(), chromeExtensionPlugin('oldchrome')],
            output: {
                file: 'dist/oldchrome/index.js',
                format: 'iife' as const,
                name: 'graphdlc',
                sourcemap: 'hidden' as const,
                minify: true,
            },
        },
        {
            ...baseInputConfig,
            plugins: [rawPlugin(), scssInjectPlugin(), tampermonkeyPlugin()],
            output: {
                file: 'dist/tampermonkey/tampermonkey.js',
                format: 'iife' as const,
                name: 'graphdlc',
                sourcemap: 'hidden' as const,
                minify: true,
            },
        },
    );
} else {
    configs.push({
        ...baseInputConfig,
        plugins: [
            rawPlugin(), 
            scssInjectPlugin(),
            {
                name: 'dev-copy-plugin',
                async writeBundle() {
                    const devOutDir = path.resolve(projectRoot, 'dist/dev');
                    
                    const publicSrc = path.resolve(projectRoot, 'logic-arrows/public');
                    if (fs.existsSync(publicSrc)) {
                        fs.cpSync(publicSrc, devOutDir, { recursive: true });
                    }

                    const indexHtmlSrc = path.resolve(projectRoot, 'templates/dev/index.html');
                    const indexHtmlDest = path.resolve(devOutDir, 'index.html');
                    if (fs.existsSync(indexHtmlSrc)) {
                        fs.copyFileSync(indexHtmlSrc, indexHtmlDest);
                    }
                }
            }
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
