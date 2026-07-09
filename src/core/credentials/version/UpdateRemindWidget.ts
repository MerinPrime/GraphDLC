import {
    IgnoreLocale,
    LaterLocale,
    LatestVersionLocale,
    UpdateAvailableLocale,
    UpdateLocale,
    YourVersionLocale,
} from './UpdateRemindLocale';

export class UpdateRemindWidget {
    private element: HTMLDivElement;

    constructor(
        private currentVersion: string,
        private latestVersion: string,
        private onUpdate: () => void,
        private onLater: () => void,
        private onIgnore: () => void,
    ) {
        this.element = document.createElement('div');
        this.element.className = 'update-remind-widget';

        this.render();
    }

    private render() {
        this.element.innerHTML = `
            <div class="update-remind-widget__title">
                ${UpdateAvailableLocale.get()}
            </div>

            <div class="update-remind-widget__content">
                ${YourVersionLocale.get(this.currentVersion)}
                <br>
                ${LatestVersionLocale.get(this.latestVersion)}
            </div>

            <div class="update-remind-widget__actions">
                <button class="update-remind-widget__button update-remind-widget__button--ignore">
                    ${IgnoreLocale.get()}
                </button>

                <button class="update-remind-widget__button update-remind-widget__button--later">
                    ${LaterLocale.get()}
                </button>

                <button class="update-remind-widget__button update-remind-widget__button--update">
                    ${UpdateLocale.get()}
                </button>
            </div>
        `;

        this.element
            .querySelector('.update-remind-widget__button--update')!
            .addEventListener('click', () => {
                this.onUpdate();
                this.destroy();
            });

        this.element
            .querySelector('.update-remind-widget__button--ignore')!
            .addEventListener('click', () => {
                this.onIgnore();
                this.destroy();
            });

        this.element
            .querySelector('.update-remind-widget__button--later')!
            .addEventListener('click', () => {
                this.onLater();
                this.destroy();
            });
    }

    public show() {
        document.body.appendChild(this.element);
    }

    public destroy() {
        this.element.remove();
    }
}
