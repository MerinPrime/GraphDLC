import { PatchGame } from './PatchGame';
import { PatchGameRender } from './PatchGameRender';
import { PatchLoadShader } from './PatchLoadShader';

export const DarkThemePlugin = [PatchGame, PatchGameRender, PatchLoadShader];
