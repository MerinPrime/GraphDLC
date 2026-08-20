import { PatchGame } from './PatchGame';
import { PatchPlayerControls } from './PatchPlayerControls';
import { PatchPlayerUI } from './PatchPlayerUI';
import { PatchSpeedController } from './PatchSpeedController';

export const TPSPlugin = [
    PatchGame,
    PatchPlayerControls,
    PatchPlayerUI,
    PatchSpeedController,
];
