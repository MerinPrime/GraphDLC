import { UpdateManager } from './core/credentials/UpdateManager';
import { GraphDLC } from './core/GraphDLC';
import { PatchLoader } from './core/PatchLoader';
import { InjectGraphDLCv2 } from './graphdlcv2';

const selectedBundle = localStorage.getItem('arrows:selectedBundleId');
const selectedVersion = selectedBundle ?? '1_4';
if (selectedBundle === null)
    localStorage.setItem('arrows:selectedBundleId', '1_4');

if (selectedVersion === '1_2_1') {
    localStorage.removeItem('graphdlc:unsupported');

    InjectGraphDLCv2();
} else if (selectedVersion === '1_4') {
    localStorage.removeItem('graphdlc:unsupported');

    const patchLoader = new PatchLoader();
    patchLoader.hook();
    const graphDLC = new GraphDLC(patchLoader);
    graphDLC.setup();

    window.graphdlc = graphDLC;
} else if (localStorage.getItem('graphdlc:unsupported') !== '1') {
    localStorage.setItem('graphdlc:unsupported', '1');
    const updateManager = new UpdateManager();
    updateManager.setup();
    alert(
        'GraphDLC: Неподдерживаемая версия игры. Мод временно отключен. Ожидайте обновление!',
    );
}
