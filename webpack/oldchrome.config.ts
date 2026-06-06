import path from 'node:path';
import CopyPlugin from 'copy-webpack-plugin';
import type webpack from 'webpack';
import ZipPlugin from 'zip-webpack-plugin';

export default (packageJson: any): webpack.Configuration => ({
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, '../dist/oldchrome/'),
        clean: true,
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: './templates/oldchrome/manifest.json',
                    to: 'manifest.json',
                    transform: (content: Buffer) => {
                        const manifest = JSON.parse(content.toString());
                        manifest.version = packageJson.version;
                        return JSON.stringify(manifest, null, 2);
                    },
                },
                { from: './templates/oldchrome/images', to: 'images' },
                {
                    from: './templates/oldchrome/injector.js',
                    to: 'injector.js',
                },
            ],
        }),
        new ZipPlugin({
            path: path.resolve(__dirname, '../dist'),
            filename: 'oldchrome-dist.zip',
        }) as unknown as webpack.WebpackPluginInstance,
    ],
});
