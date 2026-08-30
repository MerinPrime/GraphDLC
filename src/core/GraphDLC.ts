import { PluginManager } from 'src/plugins/core/PluginManager';
import { PluginRegistry } from 'src/plugins/core/PluginRegistry';
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
    public pluginManager: PluginManager;

    public constructor(patchLoader: PatchLoader) {
        this.patchLoader = patchLoader;
        this.settingsManager = new SettingsManager();
        this.designManager = new DesignManager();
        this.pathFinder = new PathFinder();
        this.updateManager = new UpdateManager();
        this.pluginManager = new PluginManager(PluginRegistry);
    }

    public setup() {
        this.pluginManager.setup();
        this.settingsManager.registerSettings(
            this.pluginManager.gatherSettings(),
        );
        this.settingsManager.setup();
        this.designManager.setup();
        this.updateManager.setup();
        this.inject();
        checkVersion();
    }

    public inject() {
        this.pluginManager.injectPlugins(this, this.patchLoader);
    }
}
