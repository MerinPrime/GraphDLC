import path from 'node:path';
import CopyPlugin from 'copy-webpack-plugin';
import type { Configuration, WebpackPluginInstance } from 'webpack';
import ZipPlugin from 'zip-webpack-plugin';

export default (packageJson: any): Configuration => ({
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, '../dist/newchrome/'),
        clean: true,
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: './templates/newchrome/manifest.json',
                    to: 'manifest.json',
                    transform: (content: Buffer) => {
                        const manifest = JSON.parse(content.toString());
                        manifest.version = packageJson.version;
                        return JSON.stringify(manifest, null, 2);
                    },
                },
                { from: './templates/newchrome/images', to: 'images' },
            ],
        }),
        new ZipPlugin({
            path: path.resolve(__dirname, '../dist'),
            filename: 'newchrome-dist.zip',
        }) as unknown as WebpackPluginInstance,
    ],
});
