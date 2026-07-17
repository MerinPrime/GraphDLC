import type { loadShader } from '@logic-arrows/render-engine/shader-loader';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { DarkThemeSetting } from 'src/core/settings/instances/redesign/DarkThemeSetting';
import type { IPatcher } from '../Patcher';
import patchedArrowChunkShader from './shaders/arrow-chunk.frag?raw';
import patchedSolidColorShader from './shaders/solid-color.frag?raw';

export const PatchLoadShader: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'loadShader',
        (_loadShader: typeof loadShader) => {
            return async function patchedLoadShader(path: string) {
                if (path.includes('solid-color.frag')) {
                    return patchedSolidColorShader;
                }
                if (DarkThemeSetting.value) {
                    if (path.includes('arrow-chunk.frag')) {
                        return patchedArrowChunkShader;
                    }
                }
                return _loadShader(path);
            };
        },
    );
};
