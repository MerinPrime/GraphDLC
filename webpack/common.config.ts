import path from 'node:path';
import TerserPlugin from 'terser-webpack-plugin';
import type { Configuration } from 'webpack';
import webpack from 'webpack';

export default (isProduction: boolean): Configuration => ({
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'nosources-source-map' : 'source-map',
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                        },
                    },
                ],
                exclude: /node_modules/,
            },
            {
                test: /\.scss$/,
                resourceQuery: /raw/,
                type: 'asset/source',
                use: ['sass-loader'],
            },
            {
                test: /\.scss$/,
                resourceQuery: { not: [/raw/] },
                use: ['style-loader', 'css-loader', 'sass-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        modules: [path.resolve(__dirname, '..'), 'node_modules'],
        alias: {
            '@logic-arrows': path.resolve(__dirname, '../logic-arrows/src'),
        },
    },
    performance: {
        hints: false,
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.IS_DEBUG': JSON.stringify(!isProduction),
        }),
    ],
    optimization: {
        minimize: isProduction,
        minimizer: isProduction
            ? [
                  new TerserPlugin({
                      terserOptions: {
                          format: {
                              comments:
                                  /==UserScript==|@name|@version|@author|@description|@match|@grant|@run-at|@namespace/,
                          },
                          compress: {
                              drop_console: false,
                              unsafe: true,
                          },
                      },
                  }),
              ]
            : [],
    },
});
