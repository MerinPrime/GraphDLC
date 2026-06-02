import { PatchUIMenu } from 'src/patches/settings/PatchUIMenu';
import { PatchSettingsPage } from '../patches/settings/PatchSettingsPage';
import type { PatchLoader } from './PatchLoader';
import { SettingsManager } from './settings/Manager';

export class GraphDLC {
    patchLoader: PatchLoader;
    settingsManager: SettingsManager;

    constructor(patchLoader: PatchLoader) {
        this.patchLoader = patchLoader;
        this.settingsManager = new SettingsManager();
    }

    inject() {
        PatchSettingsPage(this.patchLoader, this);
        PatchUIMenu(this.patchLoader, this);
    }
}
