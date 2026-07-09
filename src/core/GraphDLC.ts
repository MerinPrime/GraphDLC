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
import { PatchGameRender } from 'src/patches/render/PatchGameRender';
import { PatchLoadShader } from 'src/patches/render/PatchLoadShader';
import { PatchUIMenu } from 'src/patches/settings/PatchUIMenu';
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
        PatchArrow(this.patchLoader, this);
        PatchChunk(this.patchLoader, this);
        PatchSettingsPage(this.patchLoader, this);
        PatchGameMap(this.patchLoader, this);
        PatchPlayerUI(this.patchLoader, this);
        PatchGame(this.patchLoader, this);
        PatchPlayerControls(this.patchLoader, this);
        PatchUIMenu(this.patchLoader, this);
        PatchLoadShader(this.patchLoader, this);
        PatchGameRender(this.patchLoader, this);
        PatchLoad(this.patchLoader, this);
        PatchSave(this.patchLoader, this);
        PatchChunkUpdates(this.patchLoader, this);
        PatchBackend(this.patchLoader, this);
        PatchPlayerArrowActions(this.patchLoader, this);
        PatchSpeedController(this.patchLoader, this);
    }
}
