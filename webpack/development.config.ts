import path from 'node:path';
import CopyPlugin from 'copy-webpack-plugin';
import type { Configuration } from 'webpack';
import 'webpack-dev-server';

export default (): Configuration => ({
    output: {
        filename: 'graphdlc.js',
        path: path.resolve(__dirname, '../dist/dev/'),
        clean: true,
    },
    devServer: {
        historyApiFallback: true,
        static: {
            directory: path.join(process.cwd(), 'dist', 'dev'),
            publicPath: '/',
            watch: true,
        },
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: path.join(process.cwd(), 'logic-arrows', 'public'),
                    to: path.join(process.cwd(), 'dist', 'dev'),
                    globOptions: {
                        ignore: ['**/index.html', '**/bundle.js'],
                    },
                },
                {
                    from: path.join(
                        process.cwd(),
                        'templates',
                        'dev',
                        'index.html',
                    ),
                    to: path.join(process.cwd(), 'dist', 'dev', 'index.html'),
                },
            ],
        }),
    ],
});
