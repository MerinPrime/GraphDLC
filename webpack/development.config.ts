import CopyPlugin from 'copy-webpack-plugin';
import path from 'node:path';
import { Configuration } from 'webpack';
import 'webpack-dev-server';

export default (): Configuration => ({
    output: {
        filename: 'graphdlc.js',
        path: path.resolve(__dirname, '../dist/dev/'),
    },
    devServer: {
      historyApiFallback: true,
      static: {
          directory: path.join(process.cwd(), 'dist', 'dev'),
          publicPath: '/', 
          watch: true,
      },
      headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0"
      },
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { 
                    from: path.join(process.cwd(), 'logic-arrows', 'public'), 
                    to: path.join(process.cwd(), 'dist', 'dev'),
                    globOptions: {
                        ignore: ['**/index.html'],
                    },
                },
                { 
                    from: path.join(process.cwd(), 'templates', 'dev', 'index.html'),
                    to: path.join(process.cwd(), 'dist', 'dev', 'index.html'),
                }
            ],
        }),
    ]
});
