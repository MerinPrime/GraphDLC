import { DarkThemePlugin } from 'src/patches/dark_theme';
import { DeveloperPlugin } from 'src/patches/developer';
import { CorePlugin } from 'src/patches/graphdlc';
import { MapProtectionPlugin } from 'src/patches/map_protection';
import { MoveSelectionPlugin } from 'src/patches/move_selection';
import { NewSavePlugin } from 'src/patches/new_save';
import { OptimizeSelectionPlugin } from 'src/patches/opt_selection';
import { ApplyPatches } from 'src/patches/Patcher';
import { PathPlugin } from 'src/patches/path';
import { PowerPlugin } from 'src/patches/power';
import { SelectionTipPlugin } from 'src/patches/selection_tip';
import { SettingsPlugin } from 'src/patches/settings';
import { TPSPlugin } from 'src/patches/tps';
import { VisualSelectionPlugin } from 'src/patches/visual_selection';
import { DesignManager } from 'src/redesign/DesignManager';
import { UpdateManager } from './credentials/UpdateManager';
import { checkVersion } from './credentials/version/VersionState';
import type { PatchLoader } from './PatchLoader';
import { PathFinder } from './path_finder/PathFinder';
import { SettingsManager } from './settings/Manager';

export class GraphDLC {
    public patchLoader: PatchLoader;
    public settingsManager: SettingsManager;
    private designManager: DesignManager;
    private updateManager: UpdateManager;
    public pathFinder: PathFinder;

    public constructor(patchLoader: PatchLoader) {
        this.patchLoader = patchLoader;
        this.settingsManager = new SettingsManager();
        this.designManager = new DesignManager();
        this.pathFinder = new PathFinder();
        this.updateManager = new UpdateManager();
    }

    public setup() {
        this.settingsManager.setup();
        this.designManager.setup();
        this.updateManager.setup();
        this.inject();
        checkVersion();
    }

    public inject() {
        ApplyPatches(this.patchLoader, this, CorePlugin);
        ApplyPatches(this.patchLoader, this, PathPlugin);
        ApplyPatches(this.patchLoader, this, PowerPlugin);
        ApplyPatches(this.patchLoader, this, DarkThemePlugin);
        ApplyPatches(this.patchLoader, this, DeveloperPlugin);
        ApplyPatches(this.patchLoader, this, TPSPlugin);
        ApplyPatches(this.patchLoader, this, MapProtectionPlugin);
        ApplyPatches(this.patchLoader, this, SelectionTipPlugin);
        ApplyPatches(this.patchLoader, this, SettingsPlugin);
        ApplyPatches(this.patchLoader, this, NewSavePlugin);

        ApplyPatches(this.patchLoader, this, OptimizeSelectionPlugin);
        ApplyPatches(this.patchLoader, this, MoveSelectionPlugin);
        ApplyPatches(this.patchLoader, this, VisualSelectionPlugin);
    }
}
