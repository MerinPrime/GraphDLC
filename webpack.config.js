const path = require("node:path");
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const packageJson = require('./package.json');

module.exports = (env) => {
    const isProduction = env.production;
    
    const config = {
        mode: isProduction ? 'production' : 'development',
        devtool: isProduction ? 'nosources-source-map' : 'source-map',
        entry: './src/index.ts',
        output: {
            filename: 'index.js',
            path: path.resolve(__dirname, './dist/'),
            clean: true,
        },
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
        plugins: [
            new CopyPlugin({
                patterns: [
                    {
                        from: './template/manifest.json',
                        to: 'manifest.json',
                        transform: (content) => {
                          const manifest = JSON.parse(content.toString());
                          manifest.version = packageJson.version;
                          return JSON.stringify(manifest, null, 2);
                        },
                    },
                    { from: './template/images', to: 'images' },
                    { from: './template/style.css', to: 'style.css' },
                ],
            }),
        ],
        performance: {
            hints: false,
        },
        optimization: {
            minimize: isProduction,
            minimizer: []
        }
    };
    
    if (isProduction) {
        config.optimization.minimizer = [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: false,
                        unsafe: true,
                    },
                },
            }),
        ];
        config.plugins.push(
            new ZipPlugin({
                path: path.resolve(__dirname),
                filename: 'dist.zip',
            })
        );
    }
    
    return config;
}