import { UpdateManager } from './core/credentials/UpdateManager';
import { STORAGE_KEYS } from './core/StorageKeys';
import { DesignManager } from './redesign/DesignManager';
import { InjectGraphDLCv2 } from './versions/graphdlcv2';
import { InjectGraphDLCv3 } from './versions/graphdlcv3';

const versions = {
    '1_2_1': InjectGraphDLCv2,
    '1_4': InjectGraphDLCv3,
} as const;

function handleUnsupportedVersion() {
    new DesignManager().setup(true);
    new UpdateManager().setup();

    if (localStorage.getItem(STORAGE_KEYS.Unsupported) === '1') return;
    localStorage.setItem(STORAGE_KEYS.Unsupported, '1');

    alert('GraphDLC: Неподдерживаемая версия игры. Мод временно отключен.');
}

const selectedVersion = localStorage.getItem(STORAGE_KEYS.Bundle) ?? '1_4';

localStorage.setItem(STORAGE_KEYS.Bundle, selectedVersion);

const injector = versions[selectedVersion as keyof typeof versions];

if (injector) {
    try {
        localStorage.removeItem(STORAGE_KEYS.Unsupported);
        injector();
    } catch (error) {
        console.error(error);
        handleUnsupportedVersion();
    }
} else {
    handleUnsupportedVersion();
}
