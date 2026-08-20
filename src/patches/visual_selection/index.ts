import { PatchGame } from './PatchGame';
import { PatchGameRender } from './PatchGameRender';
import { PatchLoadShader } from './PatchLoadShader';
import { PatchSelectedMap } from './PatchSelectedMap';

export const VisualSelectionPlugin = [
    PatchGameRender,
    PatchLoadShader,
    PatchGame,
    PatchSelectedMap,
];
