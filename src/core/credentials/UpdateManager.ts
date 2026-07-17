import { UpdatePreferencesStorage } from './version/UpdatePreferencesStorage';
import { UpdateRemindWidget } from './version/UpdateRemindWidget';
import { RepoLatestRelease } from './version/Utils';
import { VersionState } from './version/VersionState';

export class UpdateManager {
    private widget: UpdateRemindWidget | null = null;

    public setup() {
        VersionState.subscribe((state, version) => {
            if (location.pathname.startsWith('/map')) return;
            if (state === 'outdated') {
                const preferences = UpdatePreferencesStorage.get();
                if (preferences?.ignoredVersion === version) {
                    return;
                }
                if (
                    preferences?.remindAt &&
                    Date.now() < preferences.remindAt
                ) {
                    return;
                }
                this.show(version);
            }
        });
    }

    private doUpdate() {
        window.open(RepoLatestRelease, '_blank');
    }

    private remindLater() {
        UpdatePreferencesStorage.save({
            ...UpdatePreferencesStorage.get(),
            remindAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
        });
    }

    private ignoreVersion(version: string) {
        UpdatePreferencesStorage.save({
            ...UpdatePreferencesStorage.get(),
            ignoredVersion: version,
        });
    }

    public remove() {
        if (!this.widget) return;
        this.widget.destroy();
    }

    public show(latestVersion: string) {
        this.remove();
        this.widget = new UpdateRemindWidget(
            __CURRENT_VERSION__,
            latestVersion,
            () => this.doUpdate(),
            () => this.remindLater(),
            () => this.ignoreVersion(latestVersion),
        );
        this.widget.show();
    }
}
