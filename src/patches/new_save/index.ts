import { PatchBackend } from './PatchBackend';
import { PatchGameMap } from './PatchGameMap';
import { PatchGamePage } from './PatchGamePage';
import { PatchPlayerControls } from './PatchPlayerControls';
import { PatchUIMenu } from './PatchUIMenu';

export const NewSavePlugin = [
    PatchBackend,
    PatchGameMap,
    PatchGamePage,
    PatchPlayerControls,
    PatchUIMenu,
];
