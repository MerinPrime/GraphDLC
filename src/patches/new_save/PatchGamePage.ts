import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { GamePage } from '@logic-arrows/pages/game-page';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import { UnsavedWarnSetting } from 'src/core/settings/instances/tools/UnsavedWarnSetting';
import type { IPatcher } from '../Patcher';
import { SaveTitleHook } from './SaveTitleHook';

export const PatchGamePage: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('GamePage', (_module: typeof GamePage) => {
        // @ts-expect-error
        return class GamePage extends _module {
            private beforeUnloadHandler?: (e: BeforeUnloadEvent) => void;
            private keydownHandler: (e: KeyboardEvent) => void;

            public constructor(mapInfo: MapInfo) {
                super(mapInfo);

                if (UnsavedWarnSetting.value) {
                    SaveTitleHook.tryHook();
                    this.beforeUnloadHandler = (event: BeforeUnloadEvent) => {
                        if (SaveTitleHook.isMapChanged()) {
                            event.preventDefault();
                            return '';
                        }
                    };
                    window.addEventListener(
                        'beforeunload',
                        this.beforeUnloadHandler,
                    );
                }

                this.keydownHandler = (event: KeyboardEvent) => {
                    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
                    const isKeyS = event.code === 'KeyS';

                    if (isCtrlOrCmd && isKeyS) {
                        event.preventDefault();
                        this.doMapSave();
                    }
                };
                window.addEventListener('keydown', this.keydownHandler);
            }

            public async doMapSave(): Promise<void> {
                // @ts-expect-error
                super.autosave();
            }

            public async autosave(): Promise<void> {
                if (UnsavedWarnSetting.value) return;
                // @ts-expect-error
                super.autosave();
            }

            public async dispose(): Promise<void> {
                await super.dispose();
                SaveTitleHook.tryUnhook();
                if (UnsavedWarnSetting.value && this.beforeUnloadHandler) {
                    window.removeEventListener(
                        'beforeunload',
                        this.beforeUnloadHandler,
                    );
                }
                window.removeEventListener('keydown', this.keydownHandler);
            }

            public updateIsMapChanged(state: boolean) {
                SaveTitleHook.setIsMapChanged(state);
            }

            public async saveMap(buffer: number[]): Promise<number> {
                // @ts-expect-error
                const status = await super.saveMap(buffer);
                if (status === 200) this.updateIsMapChanged(false);
                return status;
            }
        };
    });
};
