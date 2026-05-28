import { merge } from 'webpack-merge';
import * as webpack from 'webpack';
import packageJson from './package.json';
import getCommonConfig from './webpack/common.config';
import getNewChromeConfig from './webpack/newchrome.config';
import getDevelopmentConfig from './webpack/development.config';
import getOldChromeConfig from './webpack/oldchrome.config';
import getTampermonkeyConfig from './webpack/tampermonkey.config';

interface WebpackEnv {
    production?: boolean;
    [key: string]: any;
}

export default (env: WebpackEnv): webpack.Configuration[] => {
    const isProduction = !!env.production;

    const common = getCommonConfig(isProduction);

    if (!isProduction) {
        return [
            merge(common, getDevelopmentConfig())
        ]
    }

    return [
        merge(common, getNewChromeConfig(packageJson)),
        merge(common, getOldChromeConfig(packageJson)),
        merge(common, getTampermonkeyConfig(packageJson)),
    ];
};
