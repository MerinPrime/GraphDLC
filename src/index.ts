import { UpdateManager } from './core/credentials/UpdateManager';
import { GraphDLC } from './core/GraphDLC';
import { PatchLoader } from './core/PatchLoader';
import { STORAGE_KEYS } from './core/StorageKeys';
import { DesignManager } from './redesign/DesignManager';

export function injectGraphDLC() {
    const patchLoader = new PatchLoader();
    patchLoader.hook();
    const graphDLC = new GraphDLC(patchLoader);
    graphDLC.setup();

    window.graphdlc = graphDLC;
}

function handleUnsupportedVersion() {
    new DesignManager().setup(true);
    new UpdateManager().setup();

    if (localStorage.getItem(STORAGE_KEYS.Unsupported) === '1') return;
    localStorage.setItem(STORAGE_KEYS.Unsupported, '1');

    alert('GraphDLC: Unsupported game version. Mod temporarily disabled.');
}

const selectedVersion = localStorage.getItem(STORAGE_KEYS.Bundle);

if (selectedVersion === null) {
    localStorage.setItem(STORAGE_KEYS.Bundle, '1_4');
    location.reload();
} else if (selectedVersion === '1_4') {
    localStorage.removeItem(STORAGE_KEYS.Unsupported);
    injectGraphDLC();
} else {
    handleUnsupportedVersion();
}
