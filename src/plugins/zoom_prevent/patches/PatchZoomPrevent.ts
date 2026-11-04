import { I18nText } from '@logic-arrows/lang/i18n-text';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import { WarnIncorrectZoomSetting } from '../settings/WarnIncorrectZoomSetting';

export const IncorrectZoomAlertLocale = new I18nText(
    'Incorrect browser zoom detected! Please set browser zoom to 100% (Ctrl + 0).',
    'Обнаружен некорректный масштаб браузера! Пожалуйста, установите масштаб на 100% (Ctrl + 0).',
    'Виявлено некоректний масштаб браузера! Будь ласка, встановіть масштаб на 100% (Ctrl + 0).',
    'Выяўлены некарэктны маштаб браўзера! Калі ласка, усталюйце маштаб на 100% (Ctrl + 0).',
    'Zoom du navigateur incorrect détecté ! Veuillez régler le zoom à 100 % (Ctrl + 0).',
);

let detectorElement: HTMLDivElement | null = null;

function get1inWidth(): number {
    if (!detectorElement) {
        detectorElement = document.createElement('div');
        detectorElement.id = 'zoom-prevent-1in-detector';
        detectorElement.style.cssText =
            'position: fixed; left: -9999px; top: -9999px; width: 1in; height: 1in; padding: 0; margin: 0; border: none; pointer-events: none; visibility: hidden;';
        const target = document.body || document.documentElement;
        if (target) {
            target.appendChild(detectorElement);
        }
    }

    if (!detectorElement.isConnected) {
        const target = document.body || document.documentElement;
        if (target) {
            target.appendChild(detectorElement);
        }
    }

    const rect = detectorElement.getBoundingClientRect();
    return rect.width || detectorElement.offsetWidth;
}

export function isBrowserZoomIncorrect(): boolean {
    const inchWidth = get1inWidth();
    if (inchWidth > 0 && Math.abs(inchWidth - 96) > 0.5) {
        return true;
    }

    if (
        window.visualViewport &&
        Math.abs(window.visualViewport.scale - 1) > 0.02
    ) {
        return true;
    }

    if (window.outerWidth > 0 && window.innerWidth > 0) {
        const ratioW = window.outerWidth / window.innerWidth;
        const zoomPercent = Math.round(ratioW * 100);

        if (Math.abs(zoomPercent - 100) > 4) {
            return true;
        }
    }

    return false;
}

export const PatchZoomPrevent: IPatcher = (
    _patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    let hasAlerted = false;
    let resizeTimer: number | null = null;

    const checkAndAlert = () => {
        if (!WarnIncorrectZoomSetting.value) return;

        if (isBrowserZoomIncorrect()) {
            if (!hasAlerted) {
                hasAlerted = true;
                alert(IncorrectZoomAlertLocale.get());
            }
        } else {
            hasAlerted = false;
        }
    };

    window.addEventListener('resize', () => {
        if (resizeTimer !== null) {
            window.clearTimeout(resizeTimer);
        }
        resizeTimer = window.setTimeout(() => {
            checkAndAlert();
        }, 300);
    });

    WarnIncorrectZoomSetting.onChange.add((enabled) => {
        if (enabled) {
            hasAlerted = false;
            checkAndAlert();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (resizeTimer !== null) {
                window.clearTimeout(resizeTimer);
            }
            resizeTimer = window.setTimeout(() => {
                checkAndAlert();
            }, 300);
        });
    } else {
        if (resizeTimer !== null) {
            window.clearTimeout(resizeTimer);
        }
        resizeTimer = window.setTimeout(() => {
            checkAndAlert();
        }, 300);
    }
};
