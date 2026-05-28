import path from 'node:path';
import webpack from 'webpack';
import ZipPlugin from 'zip-webpack-plugin';

function createTampermonkeyHeader(pkg: any): string {
    return `// ==UserScript==
            // @name         ${pkg.name}
            // @namespace    https://logic-arrows.io/
            // @version      ${pkg.version}
            // @description  ${pkg.description}
            // @author       ${pkg.author}
            // @match        https://logic-arrows.io/*
            // @grant        none
            // @run-at       document-start
            // ==/UserScript==
                        
            fetch("https://raw.githubusercontent.com/MerinPrime/graphopt/refs/heads/main/templates/newchrome/style.css")
            .then(res => res.text())
            .then(css => {
                const style = document.createElement("style");
                style.textContent = css;
                document.head.appendChild(style);
            });`;
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
            raw: true
        }),
        // Твой фикс типов здесь:
        new ZipPlugin({
            path: path.resolve(__dirname, '../dist'),
            filename: 'tampermonkey-dist.zip',
        }) as unknown as webpack.WebpackPluginInstance
    ]
});
