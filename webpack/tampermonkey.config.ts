import path from 'node:path';
import webpack from 'webpack';
import ZipPlugin from 'zip-webpack-plugin';

function createTampermonkeyHeader(pkg: any): string {
    return `// ==userscript==
// @name         ${pkg.name}
// @namespace    https://logic-arrows.io/
// @version      ${pkg.version}
// @description  ${pkg.description}
// @author       ${pkg.author}
// @match        https://logic-arrows.io/*
// @match        https://v1_2.logic-arrows.io/*
// @grant        none
// @run-at       document-start
// ==/userscript==`;
}

export default (packageJson: any): webpack.Configuration => ({
    output: {
        filename: 'tampermonkey.js',
        path: path.resolve(__dirname, '../dist/tampermonkey/'),
        clean: true,
    },
    plugins: [
        new webpack.BannerPlugin({
            banner: createTampermonkeyHeader(packageJson),
            entryOnly: true,
        }),
        new ZipPlugin({
            path: path.resolve(__dirname, '../dist'),
            filename: 'tampermonkey-dist.zip',
        }) as unknown as webpack.WebpackPluginInstance,
    ],
});
