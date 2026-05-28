import { Configuration } from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import path from 'node:path';

export default (isProduction: boolean): Configuration => ({
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'nosources-source-map' : 'source-map',
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.ts$/, 
                use: 'ts-loader',
                include: [path.resolve(process.cwd(), 'src')], 
                exclude: /logic-arrows/, 
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
                    format: {
                        comments: /==UserScript==|@name|@version|@author|@description|@match|@grant|@run-at|@namespace/,
                    },
                    compress: {
                        drop_console: false,
                        unsafe: true,
                    },
                },
            }),
        ] : [],
    }
});
