import { Configuration } from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';

export default (isProduction: boolean): Configuration => ({
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
