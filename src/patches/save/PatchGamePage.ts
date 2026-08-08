import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { GamePage } from '@logic-arrows/pages/game-page';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

export const Save_PatchGamePage: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('GamePage', (_module: typeof GamePage) => {
        // @ts-expect-error
        return class GamePage extends _module {
            private originalTitle: string = '';
            private isMapChanged: boolean = false;

            private beforeUnloadHandler: (e: BeforeUnloadEvent) => void;
            private keydownHandler: (e: KeyboardEvent) => void;

            public constructor(mapInfo: MapInfo) {
                super(mapInfo);

                const descriptor = Object.getOwnPropertyDescriptor(
                    Document.prototype,
                    'title',
                );
                const _this = this;
                if (descriptor) {
                    Object.defineProperty(document, 'title', {
                        get() {
                            return descriptor.get?.call(this) ?? '';
                        },
                        set(val) {
                            _this.originalTitle = val;
                            if (_this.isMapChanged) val = `* ${val}`;
                            descriptor.set?.call(this, val);
                        },
                        configurable: true,
                        enumerable: true,
                    });
                }

                this.beforeUnloadHandler = (event: BeforeUnloadEvent) => {
                    if (this.isMapChanged) {
                        event.preventDefault();
                        return '';
                    }
                };
                window.addEventListener(
                    'beforeunload',
                    this.beforeUnloadHandler,
                );

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

            public async autosave(): Promise<void> {}

            public async dispose(): Promise<void> {
                await super.dispose();
                delete (document as any).title;
                window.removeEventListener(
                    'beforeunload',
                    this.beforeUnloadHandler,
                );
                window.removeEventListener('keydown', this.keydownHandler);
            }

            public updateIsMapChanged(state: boolean) {
                this.isMapChanged = state;
                document.title = this.originalTitle;
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
