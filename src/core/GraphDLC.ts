import { PatchLangSettings } from 'src/patches/core/PatchLangSettings';
import { PatchPlayerArrowActions } from 'src/patches/dev/PatchPlayerArrowActions';
import { PatchPlayerControls } from 'src/patches/dev/PatchPlayerControls';
import { PatchPlayerUI } from 'src/patches/dev/PatchPlayerUI';
import { PatchSpeedController } from 'src/patches/dev/PatchSpeedController';
import { PatchArrow } from 'src/patches/graph/PatchArrow';
import { PatchChunk } from 'src/patches/graph/PatchChunk';
import { PatchChunkUpdates } from 'src/patches/graph/PatchChunkUpdates';
import { PatchGame } from 'src/patches/graph/PatchGame';
import { PatchGameMap } from 'src/patches/graph/PatchGameMap';
import { PatchLoad } from 'src/patches/graph/PatchLoad';
import { PatchSave } from 'src/patches/graph/PatchSave';
import { PatchBackend } from 'src/patches/map_protection/PatchBackend';
import { MoveSelectionPlugin } from 'src/patches/move_selection';
import { OptimizeSelectionPlugin } from 'src/patches/opt_selection';
import { ApplyPatches } from 'src/patches/Patcher';
import { PatchGameRender } from 'src/patches/render/PatchGameRender';
import { PatchLoadShader } from 'src/patches/render/PatchLoadShader';
import { Save_PatchBackend } from 'src/patches/save/PatchBackend';
import { Save_PatchGameMap } from 'src/patches/save/PatchGameMap';
import { Save_PatchGamePage } from 'src/patches/save/PatchGamePage';
import { Save_PatchPlayerControls } from 'src/patches/save/PatchPlayerControls';
import { Save_PatchUIMenu } from 'src/patches/save/PatchUIMenu';
import { PatchUIMenu } from 'src/patches/settings/PatchUIMenu';
import { VisualSelectionPlugin } from 'src/patches/visual_selection';
import { DesignManager } from 'src/redesign/DesignManager';
import { PatchSettingsPage } from '../patches/settings/PatchSettingsPage';
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
        ApplyPatches(this.patchLoader, this, [
            PatchArrow,
            PatchChunk,
            PatchSettingsPage,
            PatchGameMap,
            PatchPlayerUI,
            PatchGame,
            PatchPlayerControls,
            PatchUIMenu,
            PatchLoadShader,
            PatchGameRender,
            PatchLoad,
            PatchSave,
            PatchChunkUpdates,
            PatchBackend,
            PatchPlayerArrowActions,
            PatchSpeedController,
            PatchLangSettings,
        ]);

        // if (UnsavedWarnSetting.value)
        ApplyPatches(this.patchLoader, this, [
            Save_PatchGamePage,
            Save_PatchGameMap,
            Save_PatchBackend,
            Save_PatchUIMenu,
            Save_PatchPlayerControls,
        ]);

        ApplyPatches(this.patchLoader, this, OptimizeSelectionPlugin);
        ApplyPatches(this.patchLoader, this, MoveSelectionPlugin);
        ApplyPatches(this.patchLoader, this, VisualSelectionPlugin);
    }
}
