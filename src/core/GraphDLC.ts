import { PatchPlayerControls } from 'src/patches/dev/PatchPlayerControls';
import { PatchPlayerUI } from 'src/patches/dev/PatchPlayerUI';
import { PatchArrow } from 'src/patches/graph/PatchArrow';
import { PatchGame } from 'src/patches/graph/PatchGame';
import { PatchUIMenu } from 'src/patches/settings/PatchUIMenu';
import { DesignManager } from 'src/redesign/DesignManager';
import { PatchSettingsPage } from '../patches/settings/PatchSettingsPage';
import type { PatchLoader } from './PatchLoader';
import { SettingsManager } from './settings/Manager';

export class GraphDLC {
    patchLoader: PatchLoader;
    settingsManager: SettingsManager;
    designManager: DesignManager;

    constructor(patchLoader: PatchLoader) {
        this.patchLoader = patchLoader;
        this.settingsManager = new SettingsManager();
        this.designManager = new DesignManager();
    }

    inject() {
        PatchArrow(this.patchLoader, this);
        PatchSettingsPage(this.patchLoader, this);
        PatchPlayerUI(this.patchLoader, this);
        PatchGame(this.patchLoader, this);
        PatchPlayerControls(this.patchLoader, this);
        PatchUIMenu(this.patchLoader, this);
    }
}
