import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { GamePage } from '@logic-arrows/pages/game-page';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import { SaveMode, SaveModeSetting } from '../settings/SaveModeSetting';
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
            private settingHook: (newState: SaveMode) => void = (newState) => {
                // SaveTitleHook.setHookState(newState === SaveMode.CTRL_S_ONLY);
                SaveTitleHook.setHookState(true);
            };

            private canSave: boolean = true;

            public constructor(mapInfo: MapInfo) {
                super(mapInfo);

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
                // SaveTitleHook.setHookState(SaveModeSetting.value === SaveMode.CTRL_S_ONLY);
                SaveTitleHook.setHookState(true);
                SaveModeSetting.onChange.add(this.settingHook);

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
                if (SaveModeSetting.value === SaveMode.NEVER) return;
                // @ts-expect-error
                super.autosave();
            }

            public async autosave(): Promise<void> {
                if (SaveModeSetting.value !== SaveMode.NORMAL) return;
                // @ts-expect-error
                super.autosave();
            }

            public async dispose(): Promise<void> {
                if (SaveModeSetting.value !== SaveMode.NORMAL)
                    this.canSave = false;
                await super.dispose();
                SaveTitleHook.tryUnhook();
                SaveModeSetting.onChange.remove(this.settingHook);
                if (this.beforeUnloadHandler) {
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
                if (!this.canSave) return -1;
                // @ts-expect-error
                const status = await super.saveMap(buffer);
                if (status === 200) this.updateIsMapChanged(false);
                return status;
            }
        };
    });
};
