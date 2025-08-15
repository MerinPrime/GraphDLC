const path = require("node:path");
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const packageJson = require('./package.json');

function createTampermonkeyHeader(pkg) {
    return `// ==UserScript==
            // @name         ${pkg.name}
            // @namespace    https://logic-arrows.io/
            // @version      ${pkg.version}
            // @description  ${pkg.description}
            // @author       ${pkg.author}
            // @match        https://logic-arrows.io/*
            // @grant        none
            // ==/UserScript==`;
}

module.exports = (env) => {
    const isProduction = !!env.production;

    const commonConfig = {
        mode: isProduction ? 'production' : 'development',
        devtool: isProduction ? 'nosources-source-map' : 'source-map',
        entry: './src/index.ts',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        performance: {
            hints: false,
        },
        optimization: {
            minimize: isProduction,
            minimizer: isProduction ? [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            drop_console: false,
                            unsafe: true,
                        },
                    },
                }),
            ] : [],
        }
    };

    const newChromeConfig = {
        output: {
            filename: 'index.js',
            path: path.resolve(__dirname, './dist/newchrome/'),
            clean: true,
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    {
                        from: './template/newchrome/manifest.json',
                        to: 'manifest.json',
                        transform: (content) => {
                            const manifest = JSON.parse(content.toString());
                            manifest.version = packageJson.version;
                            return JSON.stringify(manifest, null, 2);
                        },
                    },
                    { from: './template/newchrome/images', to: 'images' },
                    { from: './template/newchrome/style.css', to: 'style.css' },
                ],
            }),
            ...(isProduction ? [new ZipPlugin({
                path: path.resolve(__dirname, './dist'),
                filename: 'newchrome-dist.zip',
            })] : [])
        ],
    };

    const oldChromeConfig = {
        output: {
            filename: 'index.js',
            path: path.resolve(__dirname, './dist/oldchrome/'),
            clean: true,
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    {
                        from: './template/oldchrome/manifest.json',
                        to: 'manifest.json',
                        transform: (content) => {
                            const manifest = JSON.parse(content.toString());
                            manifest.version = packageJson.version;
                            return JSON.stringify(manifest, null, 2);
                        },
                    },
                    { from: './template/oldchrome/images', to: 'images' },
                    { from: './template/oldchrome/style.css', to: 'style.css' },
                ],
            }),
            ...(isProduction ? [new ZipPlugin({
                path: path.resolve(__dirname, './dist'),
                filename: 'oldchrome-dist.zip',
            })] : [])
        ],
    };
    const tampermonkeyConfig = {
        output: {
            filename: 'tampermonkey.js',
            path: path.resolve(__dirname, './dist/tampermonkey/'),
            clean: true,
        },
        plugins: [
            new webpack.BannerPlugin({
                banner: createTampermonkeyHeader(packageJson),
                raw: true
            }),
            ...(isProduction ? [new ZipPlugin({
                path: path.resolve(__dirname, './dist'),
                filename: 'tampermonkey-dist.zip',
            })] : [])
        ]
    };

    return [
        merge(commonConfig, newChromeConfig),
        merge(commonConfig, oldChromeConfig),
        merge(commonConfig, tampermonkeyConfig),
    ];
}