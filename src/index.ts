import { UpdateManager } from './core/credentials/UpdateManager';
import { InjectGraphDLCv2 } from './versions/graphdlcv2';
import { InjectGraphDLCv3 } from './versions/graphdlcv3';

const selectedBundle = localStorage.getItem('arrows:selectedBundleId');
const selectedVersion = selectedBundle ?? '1_4';
if (selectedBundle === null)
    localStorage.setItem('arrows:selectedBundleId', '1_4');

if (selectedVersion === '1_2_1') {
    localStorage.removeItem('graphdlc:unsupported');
    InjectGraphDLCv2();
} else if (selectedVersion === '1_4') {
    localStorage.removeItem('graphdlc:unsupported');
    InjectGraphDLCv3();
} else if (localStorage.getItem('graphdlc:unsupported') !== '1') {
    localStorage.setItem('graphdlc:unsupported', '1');
    const updateManager = new UpdateManager();
    updateManager.setup();
    alert(
        'GraphDLC: Неподдерживаемая версия игры. Мод временно отключен. Ожидайте обновление!',
    );
}
